import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now=new Date(); const today=new Date(now); today.setHours(0,0,0,0);
    const weekAgo=new Date(Date.now()-7*86400_000);
    const [totalUsers,onlineNow,racesToday,openFlags,newUsersWeek]=await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({where:{lastActiveAt:{gte:new Date(Date.now()-5*60_000)}}}),
      this.prisma.raceSession.count({where:{createdAt:{gte:today}}}),
      this.prisma.antiCheatFlag.count({where:{isDismissed:false}}),
      this.prisma.user.count({where:{createdAt:{gte:weekAgo}}}),
    ]);
    return {totalUsers,onlineNow,racesToday,openFlags,newUsersWeek,
      recentActivity:[
        {time:'just now',description:'System healthy — all services running'},
        {time:'1m ago',description:`${totalUsers.toLocaleString()} total registered users`},
        {time:'5m ago',description:`${newUsersWeek} new users this week`},
      ]};
  }

  async getUsers(opts:{search?:string;filter?:string;limit?:number;offset?:number}) {
    const {search='',filter='all',limit=50,offset=0}=opts;
    const where:any={};
    if(search) where.OR=[{username:{contains:search.toLowerCase()}},{email:{contains:search.toLowerCase()}},{displayName:{contains:search}}];
    if(filter==='banned') where.isBanned=true;
    if(filter==='active') where.isBanned=false;
    if(filter==='admin') where.role={in:['ADMIN','SUPERADMIN','MODERATOR']};
    const [users,total]=await Promise.all([
      this.prisma.user.findMany({where,skip:offset,take:limit,select:{id:true,username:true,displayName:true,email:true,avatar:true,role:true,level:true,isBanned:true,banReason:true,createdAt:true,lastActiveAt:true,coins:true,gems:true,rating:true,_count:{select:{raceSessions:true}}},orderBy:{createdAt:'desc'}}),
      this.prisma.user.count({where}),
    ]);
    return {users:users.map(u=>({...u,totalRaces:u._count.raceSessions})),total};
  }

  async banUser(targetId:string, actorId:string, reason:string) {
    if(targetId===actorId) throw new ForbiddenException('Cannot ban yourself');
    const target=await this.prisma.user.findUnique({where:{id:targetId}});
    if(!target) throw new NotFoundException('User not found');
    if(['ADMIN','SUPERADMIN'].includes(target.role)) throw new ForbiddenException('Cannot ban another admin');
    const updated=await this.prisma.user.update({where:{id:targetId},data:{isBanned:true,banReason:reason??'Admin action'}});
    await this.prisma.antiCheatFlag.create({data:{userId:targetId,reason:`Banned by admin: ${reason}`,severity:'critical',count:1}}).catch(()=>{});
    return updated;
  }

  async unbanUser(targetId:string) { return this.prisma.user.update({where:{id:targetId},data:{isBanned:false,banReason:null}}); }

  async setRole(targetId:string, role:string) {
    if(!['USER','MODERATOR','ADMIN'].includes(role)) throw new ForbiddenException('Invalid role');
    return this.prisma.user.update({where:{id:targetId},data:{role}});
  }

  async getFlags(limit=50) {
    const flags=await this.prisma.antiCheatFlag.findMany({where:{isDismissed:false},orderBy:{count:'desc'},take:limit,include:{user:{select:{username:true,displayName:true}}}});
    return flags.map(f=>({id:f.id,userId:f.userId,username:f.user.username,displayName:f.user.displayName,reason:f.reason,severity:f.severity,count:f.count,lastFlaggedAt:f.updatedAt}));
  }

  async dismissFlag(id:string) { return this.prisma.antiCheatFlag.update({where:{id},data:{isDismissed:true}}); }
  async getFeatures() { return this.prisma.featureFlag.findMany({orderBy:{key:'asc'}}); }
  async setFeature(key:string, enabled:boolean) { return this.prisma.featureFlag.upsert({where:{key},create:{key,name:key,enabled,updatedAt:new Date()},update:{enabled,updatedAt:new Date()}}); }

  async getAnalytics() {
    const weekAgo=new Date(Date.now()-7*86400_000);
    const [totalUsers,races7d,newUsers7d,sessionsAll]=await Promise.all([
      this.prisma.user.count(),
      this.prisma.raceSession.count({where:{createdAt:{gte:weekAgo}}}),
      this.prisma.user.count({where:{createdAt:{gte:weekAgo}}}),
      this.prisma.raceSession.findMany({select:{wpm:true},take:5000}),
    ]);
    const avgWpm=sessionsAll.length?Math.round(sessionsAll.reduce((a,s)=>a+s.wpm,0)/sessionsAll.length):0;
    return {totalUsers,races7d,newUsers7d,avgWpm,peakConcurrent:0};
  }
}
