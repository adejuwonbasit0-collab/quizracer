import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CHEAT_WPM_THRESHOLD = 250;

@Injectable()
export class TypingService {
  private readonly logger = new Logger(TypingService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getRandomText(difficulty = 'medium', category?: string) {
    const where = { isActive:true, difficulty, ...(category?{category}:{}) };
    const count = await this.prisma.typingText.count({ where });
    if (count === 0) return this.fallbackText(difficulty);
    const skip = Math.floor(Math.random() * count);
    const texts = await this.prisma.typingText.findMany({ where, skip, take: 1 });
    if (!texts.length) return this.fallbackText(difficulty);
    await this.prisma.typingText.update({ where: { id:texts[0].id }, data: { timesUsed: { increment:1 } } });
    return texts[0];
  }

  detectCheat(wpm: number): boolean { return wpm > CHEAT_WPM_THRESHOLD; }

  analyzeKeystrokes(keystrokes: any[]): { isCheat:boolean; reason?:string } {
    if (!keystrokes?.length) return { isCheat:false };
    const intervals = keystrokes.slice(1).map((k,i) => k.timestamp - keystrokes[i].timestamp);
    const minInterval = Math.min(...intervals);
    if (minInterval < 10) return { isCheat:true, reason:'Superhuman keystroke speed' };
    return { isCheat:false };
  }

  private fallbackText(difficulty: string) {
    const texts: Record<string,string> = {
      easy:   'The quick brown fox jumps over the lazy dog. Simple words help build typing confidence and speed.',
      medium: 'Programming is not about typing, it is about thinking. The best code is code that does not need to be written.',
      hard:   'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune.',
    };
    const content = texts[difficulty] ?? texts.medium;
    return { id: `fallback-${difficulty}`, content, difficulty, category:'general', wordCount:content.split(' ').length, charCount:content.length };
  }
}
