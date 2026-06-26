import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogue(params:{type?:string;rarity?:string;featured?:boolean;page?:number;limit?:number}) {
    const {type,rarity,featured,page=1,limit=24}=params;
    const where={isActive:true,...(type?{type}:{}),...(rarity?{rarity}:{}),...(featured!==undefined?{isFeatured:featured}:{})};
    const [data,total]=await Promise.all([this.prisma.shopItem.findMany({where,skip:(page-1)*limit,take:limit,orderBy:[{isFeatured:'desc'},{sortOrder:'asc'}]}),this.prisma.shopItem.count({where})]);
    return {data:data.map(i=>({...i,metadata:JSON.parse(i.metadata)})),total,page,limit,totalPages:Math.ceil(total/limit)};
  }

  async purchase(userId:string, itemId:string, currency:'coins'|'gems'='coins') {
    const item=await this.prisma.shopItem.findUnique({where:{id:itemId}});
    if(!item||!item.isActive) throw new NotFoundException('Item not found');
    const owned=await this.prisma.userInventory.findUnique({where:{userId_itemId:{userId,itemId}}});
    if(owned) throw new ConflictException('Already owned');
    const price=currency==='gems'?item.gemPrice:item.coinPrice;
    if(price<=0) throw new BadRequestException(`Not available for ${currency}`);
    const user=await this.prisma.user.findUnique({where:{id:userId},select:{coins:true,gems:true}});
    if(!user) throw new NotFoundException('User not found');
    if((currency==='gems'?user.gems:user.coins)<price) throw new BadRequestException(`Insufficient ${currency}`);
    await this.prisma.$transaction([
      this.prisma.user.update({where:{id:userId},data:currency==='gems'?{gems:{decrement:price}}:{coins:{decrement:price}}}),
      this.prisma.userInventory.create({data:{userId,itemId}}),
      this.prisma.transaction.create({data:{userId,type:'PURCHASE',amount:-price,currency,description:`Purchased: ${item.name}`,metadata:JSON.stringify({itemId,itemName:item.name})}}),
    ]);
    return {success:true,item:{...item,metadata:JSON.parse(item.metadata)}};
  }

  async getInventory(userId:string) {
    const inv=await this.prisma.userInventory.findMany({where:{userId},include:{item:true},orderBy:{acquiredAt:'desc'}});
    return inv.map(i=>({...i.item,metadata:JSON.parse(i.item.metadata),isEquipped:i.isEquipped,acquiredAt:i.acquiredAt}));
  }

  async equip(userId:string, itemId:string) {
    const inv=await this.prisma.userInventory.findUnique({where:{userId_itemId:{userId,itemId}},include:{item:{select:{type:true}}}});
    if(!inv) throw new NotFoundException('Not in inventory');
    await this.prisma.userInventory.updateMany({where:{userId,item:{type:inv.item.type},isEquipped:true},data:{isEquipped:false}});
    await this.prisma.userInventory.update({where:{userId_itemId:{userId,itemId}},data:{isEquipped:true}});
    return {success:true};
  }

  async unequip(userId:string, itemId:string) {
    await this.prisma.userInventory.update({where:{userId_itemId:{userId,itemId}},data:{isEquipped:false}});
    return {success:true};
  }

  async getEquipped(userId:string) {
    const eq=await this.prisma.userInventory.findMany({where:{userId,isEquipped:true},include:{item:true}});
    return eq.map(i=>({...i.item,metadata:JSON.parse(i.item.metadata)}));
  }
}
