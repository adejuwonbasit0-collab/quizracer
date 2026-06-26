import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data:{userId:string;type:string;title:string;body:string;data?:Record<string,unknown>;senderId?:string}) {
    return this.prisma.notification.create({ data:{userId:data.userId,senderId:data.senderId,type:data.type,title:data.title,body:data.body,data:JSON.stringify(data.data??{})} });
  }

  async findForUser(userId:string, page=1, limit=20, unreadOnly=false) {
    const where={userId,...(unreadOnly?{isRead:false}:{})};
    const [data,total]=await Promise.all([this.prisma.notification.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*limit,take:limit}),this.prisma.notification.count({where})]);
    return {data:data.map(n=>({...n,data:JSON.parse(n.data)})),total,page,limit};
  }

  async getUnreadCount(userId:string) { return this.prisma.notification.count({where:{userId,isRead:false}}); }
  async markRead(id:string,userId:string) { return this.prisma.notification.updateMany({where:{id,userId},data:{isRead:true,readAt:new Date()}}); }
  async markAllRead(userId:string) { return this.prisma.notification.updateMany({where:{userId,isRead:false},data:{isRead:true,readAt:new Date()}}); }
}


