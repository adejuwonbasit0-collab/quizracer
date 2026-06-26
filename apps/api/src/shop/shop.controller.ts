import { Controller, Get, Post, Delete, Param, Query, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/index';

@ApiTags('shop') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}
  @Get('items') getCatalogue(@Query('type') t:string,@Query('rarity') r:string,@Query('featured') f:string,@Query('page') p:string,@Query('limit') l:string) { return this.shop.getCatalogue({type:t,rarity:r,featured:f==='true'?true:f==='false'?false:undefined,page:+p||1,limit:+l||24}); }
  @Post('items/:id/purchase') @HttpCode(HttpStatus.OK) purchase(@CurrentUser() u:any,@Param('id') id:string,@Body() b:{currency?:'coins'|'gems'}) { return this.shop.purchase(u.id,id,b.currency??'coins'); }
  @Get('inventory') getInventory(@CurrentUser() u:any) { return this.shop.getInventory(u.id); }
  @Get('inventory/equipped') getEquipped(@CurrentUser() u:any) { return this.shop.getEquipped(u.id); }
  @Post('inventory/:id/equip') @HttpCode(HttpStatus.OK) equip(@CurrentUser() u:any,@Param('id') id:string) { return this.shop.equip(u.id,id); }
  @Delete('inventory/:id/equip') @HttpCode(HttpStatus.OK) unequip(@CurrentUser() u:any,@Param('id') id:string) { return this.shop.unequip(u.id,id); }
}
