import { Injectable, Logger } from '@nestjs/common';
import { RedisService, TTL } from '../redis/redis.service';
import { KeystrokeRecord } from '@quizracer/shared-types';

export interface AntiCheatResult {
  isValid: boolean;
  reason?: string;
  adjustedWpm?: number;
}

const MAX_HUMAN_WPM      = 250;   // Absolute physical limit
const MIN_RACE_DURATION  = 5_000; // 5 seconds minimum
const MIN_CHARS_PER_WPM  = 4.5;   // avg word length in chars
const MAX_BURST_RATIO    = 3.0;   // max WPM burst vs average
const MAX_KEYSTROKES_GAP = 2_000; // 2 seconds — suspicious gap in keystrokes

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(private readonly redis: RedisService) {}

  // ─────────────────────────────────────────────
  // VALIDATE A FINISHED RACE
  // ─────────────────────────────────────────────

  validateTypingFinish(params: {
    userId:    string;
    roomId:    string;
    wpm:       number;
    accuracy:  number;
    durationMs: number;
    textLength: number;
    keystrokes: KeystrokeRecord[];
  }): AntiCheatResult {
    const { userId, roomId, wpm, accuracy, durationMs, textLength, keystrokes } = params;

    // 1. Duration too short
    if (durationMs < MIN_RACE_DURATION) {
      this.flag(userId, roomId, 'duration_too_short', { durationMs });
      return { isValid: false, reason: 'Race completed too quickly' };
    }

    // 2. WPM exceeds human maximum
    if (wpm > MAX_HUMAN_WPM) {
      this.flag(userId, roomId, 'wpm_exceeds_max', { wpm });
      return { isValid: false, reason: 'WPM exceeds human maximum', adjustedWpm: MAX_HUMAN_WPM };
    }

    // 3. Accuracy out of range
    if (accuracy < 0 || accuracy > 100) {
      return { isValid: false, reason: 'Invalid accuracy value' };
    }

    // 4. Cross-check WPM against duration + text length
    const expectedWpm = this.computeExpectedWpm(textLength, durationMs);
    const wpmDelta    = Math.abs(wpm - expectedWpm);
    if (wpmDelta > 80) {
      // Large discrepancy — use server-computed value instead
      this.logger.warn(`WPM mismatch user=${userId} reported=${wpm} expected=${expectedWpm.toFixed(1)}`);
      return { isValid: true, adjustedWpm: Math.round(expectedWpm) };
    }

    // 5. Keystroke analysis (if provided)
    if (keystrokes.length > 0) {
      const keystrokeResult = this.analyzeKeystrokes(keystrokes, textLength);
      if (!keystrokeResult.isValid) {
        this.flag(userId, roomId, "keystroke_anomaly", keystrokeResult as unknown as Record<string, unknown>);
        return keystrokeResult;
      }
    }

    return { isValid: true };
  }

  // ─────────────────────────────────────────────
  // VALIDATE LIVE PROGRESS UPDATE
  // ─────────────────────────────────────────────

  async validateProgressUpdate(
    userId:   string,
    roomId:   string,
    progress: number,
    wpm:      number,
    gameStartedAt: number,
  ): Promise<AntiCheatResult> {
    if (progress < 0 || progress > 100) {
      return { isValid: false, reason: 'Invalid progress value' };
    }

    const elapsed = Date.now() - gameStartedAt;
    if (elapsed < 1_000 && progress > 10) {
      this.flag(userId, roomId, 'instant_progress', { progress, elapsed });
      return { isValid: false, reason: 'Progress too fast' };
    }

    // Track WPM samples for burst detection
    const sampleKey = `anticheat:wpm_samples:${userId}:${roomId}`;
    const samples   = await this.redis.get<number[]>(sampleKey) ?? [];
    samples.push(wpm);
    if (samples.length > 10) samples.shift();
    await this.redis.set(sampleKey, samples, TTL.HOUR);

    if (samples.length >= 5) {
      const avgWpm  = samples.reduce((a, b) => a + b, 0) / samples.length;
      const maxSample = Math.max(...samples);
      if (avgWpm > 0 && maxSample / avgWpm > MAX_BURST_RATIO) {
        this.logger.warn(`WPM burst anomaly user=${userId} avg=${avgWpm.toFixed(0)} peak=${maxSample}`);
        // Don't fail, but flag for review
        this.flag(userId, roomId, 'wpm_burst', { avgWpm, maxSample });
      }
    }

    return { isValid: true };
  }

  // ─────────────────────────────────────────────
  // QUIZ ANTI-CHEAT: submission timing
  // ─────────────────────────────────────────────

  validateQuizAnswer(timeMs: number, timePerRoundMs: number): AntiCheatResult {
    // Answer before question was shown
    if (timeMs < 0) {
      return { isValid: false, reason: 'Answer submitted before question displayed' };
    }
    // Tiny reaction time (< 200ms) is inhuman
    if (timeMs < 200) {
      return { isValid: false, reason: 'Answer too fast — possible automation' };
    }
    // Answer after time expired
    if (timeMs > timePerRoundMs + 2_000) { // 2s grace period
      return { isValid: false, reason: 'Answer submitted after time expired' };
    }
    return { isValid: true };
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private computeExpectedWpm(textLength: number, durationMs: number): number {
    const chars   = textLength;
    const minutes = durationMs / 60_000;
    return (chars / MIN_CHARS_PER_WPM) / minutes;
  }

  private analyzeKeystrokes(
    keystrokes: KeystrokeRecord[],
    textLength:  number,
  ): AntiCheatResult {
    if (keystrokes.length < textLength * 0.5) {
      // Too few keystrokes for the text length
      return { isValid: false, reason: 'Insufficient keystroke data' };
    }

    // Check for impossible inter-key gaps (all keystrokes exactly the same ms apart = bot)
    const gaps = keystrokes.slice(1).map((k, i) => k.timestamp - keystrokes[i].timestamp);
    if (gaps.length >= 10) {
      const uniqueGaps = new Set(gaps.map((g) => Math.round(g / 10) * 10));
      if (uniqueGaps.size === 1) {
        return { isValid: false, reason: 'Robotic typing pattern detected' };
      }
    }

    // Check for suspiciously long gaps (possible copy-paste)
    const maxGap = Math.max(...gaps);
    if (maxGap > MAX_KEYSTROKES_GAP && textLength > 100) {
      // Not an error per se, but worth noting
      this.logger.debug(`Long keystroke gap: ${maxGap}ms`);
    }

    return { isValid: true };
  }

  private flag(
    userId:  string,
    roomId:  string,
    reason:  string,
    data:    Record<string, unknown> = {},
  ): void {
    const key = `anticheat:flags:${userId}`;
    // Atomic increment — avoids lost-update race under concurrent events
    this.redis.atomicIncr(key, TTL.DAY).catch(() => {});
    this.logger.warn(`[AntiCheat] user=${userId} room=${roomId} reason=${reason}`, data);
  }

  async getFlagCount(userId: string): Promise<number> {
    return (await this.redis.get<number>(`anticheat:flags:${userId}`)) ?? 0;
  }
}
