import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface QuizQuestion { id:string; text:string; options:string[]; subject:string; difficulty:string; imageUrl?:string|null; correctIndex?:number; }

interface QuizSessionState {
  roomId:string; questions:QuizQuestion[]; currentIndex:number; questionStartedAt:number;
  timePerRound:number; scores:Record<string,number>; answers:Record<string,number>; answeredSet:Set<string>;
}

const sessions = new Map<string,QuizSessionState>();

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestions(params: { subject?:string; difficulty?:string; page?:number; limit?:number }) {
    const { subject, difficulty, page=1, limit=20 } = params;
    const where = { isActive:true, ...(subject?{subject}:{}), ...(difficulty?{difficulty}:{}) };
    const [raw, total] = await Promise.all([ this.prisma.question.findMany({ where, skip:(page-1)*limit, take:limit, orderBy:{createdAt:'desc'} }), this.prisma.question.count({where}) ]);
    return { data: raw.map(q=>({...q,options:JSON.parse(q.options),tags:JSON.parse(q.tags)})), total, page, limit, totalPages:Math.ceil(total/limit) };
  }

  async createQuestion(dto: { text:string; options:string[]; correctIndex:number; subject:string; difficulty:string; explanation?:string; imageUrl?:string; tags?:string[] }, createdBy?:string) {
    if (dto.options.length<2) throw new BadRequestException('Minimum 2 options required');
    if (dto.correctIndex>=dto.options.length) throw new BadRequestException('correctIndex out of range');
    return this.prisma.question.create({ data: { text:dto.text, options:JSON.stringify(dto.options), correctIndex:dto.correctIndex, explanation:dto.explanation, subject:dto.subject, difficulty:dto.difficulty, tags:JSON.stringify(dto.tags??[]), imageUrl:dto.imageUrl, createdBy } });
  }

  async updateQuestion(id:string, dto:any) {
    await this.findOrFail(id);
    const data:any={};
    if(dto.text) data.text=dto.text;
    if(dto.options) data.options=JSON.stringify(dto.options);
    if(dto.correctIndex!==undefined) data.correctIndex=dto.correctIndex;
    if(dto.isActive!==undefined) data.isActive=dto.isActive;
    if(dto.difficulty) data.difficulty=dto.difficulty;
    if(dto.subject) data.subject=dto.subject;
    return this.prisma.question.update({ where:{id}, data });
  }

  async fetchForRoom(count:number, difficulty='medium', subject?:string): Promise<QuizQuestion[]> {
    const where = { isActive:true, difficulty, ...(subject?{subject}:{}) };
    const raw = await this.prisma.question.findMany({ where, take:count*3, orderBy:{timesUsed:'asc'} });
    const shuffled = raw.sort(()=>Math.random()-.5).slice(0, count);
    if (!shuffled.length) return this.fallbackQuestions(count);
    this.prisma.question.updateMany({ where:{id:{in:shuffled.map(q=>q.id)}}, data:{timesUsed:{increment:1}} }).catch(()=>{});
    return shuffled.map(q=>({ id:q.id, text:q.text, options:JSON.parse(q.options), subject:q.subject, difficulty:q.difficulty, imageUrl:q.imageUrl, correctIndex:q.correctIndex }));
  }

  initSession(roomId:string, questions:QuizQuestion[], timePerRound:number, participantIds:string[]): QuizSessionState {
    const state:QuizSessionState = { roomId, questions, currentIndex:0, questionStartedAt:Date.now(), timePerRound, scores:Object.fromEntries(participantIds.map(id=>[id,0])), answers:{}, answeredSet:new Set() };
    sessions.set(roomId, state);
    return state;
  }

  getSession(roomId:string) { return sessions.get(roomId)??null; }
  clearSession(roomId:string) { sessions.delete(roomId); }

  processAnswer(roomId:string, userId:string, selectedIndex:number, questionId:string) {
    const state=sessions.get(roomId);
    if(!state) throw new NotFoundException('Quiz session not found');
    const q=state.questions[state.currentIndex];
    if(!q||q.id!==questionId) throw new BadRequestException('Wrong question ID');
    if(state.answeredSet.has(userId)) throw new BadRequestException('Already answered');
    const isCorrect=selectedIndex===q.correctIndex;
    const elapsed=Date.now()-state.questionStartedAt;
    const speedBonus=Math.max(0,1-elapsed/(state.timePerRound*1000));
    const points=isCorrect?Math.round(1000+speedBonus*500):0;
    state.answers[userId]=selectedIndex;
    state.answeredSet.add(userId);
    state.scores[userId]=(state.scores[userId]??0)+points;
    sessions.set(roomId,state);
    this.prisma.quizAttempt.create({ data:{userId,questionId:q.id,selectedIndex,isCorrect,timeMs:elapsed} }).catch(()=>{});
    return { isCorrect, pointsEarned:points, allAnswered:state.answeredSet.size>=Object.keys(state.scores).length };
  }

  advanceQuestion(roomId:string) {
    const state=sessions.get(roomId);
    if(!state) return null;
    state.currentIndex++;
    state.questionStartedAt=Date.now();
    state.answers={};
    state.answeredSet=new Set();
    sessions.set(roomId,state);
    const next=state.questions[state.currentIndex]??null;
    if(!next) return null;
    return { question:next, questionNumber:state.currentIndex, isLast:state.currentIndex>=state.questions.length-1, totalQuestions:state.questions.length };
  }

  getRevealData(roomId:string) {
    const state=sessions.get(roomId);
    if(!state) throw new NotFoundException('Session not found');
    const q=state.questions[state.currentIndex];
    return { correctIndex:q?.correctIndex??0, answers:{...state.answers}, scores:{...state.scores} };
  }

  finalizeSession(roomId:string, participants:Array<{userId:string;username:string;avatar:string|null}>) {
    const state=sessions.get(roomId);
    if(!state) return [];
    sessions.delete(roomId);
    return Object.entries(state.scores).sort(([,a],[,b])=>b-a).map(([userId,score],i)=>{
      const p=participants.find(x=>x.userId===userId);
      return { userId, username:p?.username??userId, avatar:p?.avatar??null, rank:i+1, score, wpm:0, accuracy:0, errors:0, durationMs:state.questions.length*state.timePerRound*1000, xpEarned:50+i*10, coinsEarned:20 };
    });
  }

  private fallbackQuestions(count:number): QuizQuestion[] {
    const q:QuizQuestion[]=[
      {id:'fb-1',text:'What does WPM stand for?',options:['Words Per Minute','Words Per Moment','Writing Per Minute','Work Per Mile'],subject:'typing',difficulty:'easy',correctIndex:0},
      {id:'fb-2',text:'Which language was created by Guido van Rossum?',options:['Java','Ruby','Python','Go'],subject:'programming',difficulty:'easy',correctIndex:2},
      {id:'fb-3',text:'What does HTTP stand for?',options:['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transport Protocol','High Tech Transfer Protocol'],subject:'tech',difficulty:'easy',correctIndex:0},
    ];
    return Array.from({length:count},(_,i)=>q[i%q.length]);
  }

  private async findOrFail(id:string) {
    const q=await this.prisma.question.findUnique({where:{id}});
    if(!q) throw new NotFoundException(`Question ${id} not found`);
    return q;
  }
}
