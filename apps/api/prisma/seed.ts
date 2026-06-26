import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding QuizRacer database...');

  // ── Admin user ─────────────────────────────────────────────
  const adminHash = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizracer.io' },
    update: {},
    create: {
      email: 'admin@quizracer.io',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: adminHash,
      role: 'SUPERADMIN',
      level: 99,
      xp: 999999,
      xpToNextLevel: 999999,
      coins: 99999,
      gems: 9999,
      isPremium: true,
      isVerified: true,
    },
  });

  await prisma.userStats.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, bestWpm: 200, avgWpm: 180, avgAccuracy: 99, totalGames: 500, totalWins: 450 },
  });

  // ── Demo player ────────────────────────────────────────────
  const demoHash = await argon2.hash('Demo1234!');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@quizracer.io' },
    update: {},
    create: {
      email: 'demo@quizracer.io',
      username: 'speedracer',
      displayName: 'Speed Racer',
      passwordHash: demoHash,
      role: 'USER',
      level: 12,
      xp: 3240,
      xpToNextLevel: 4000,
      coins: 2450,
      streak: 7,
      isVerified: true,
    },
  });

  await prisma.userStats.upsert({
    where: { userId: demo.id },
    update: {},
    create: { userId: demo.id, bestWpm: 127, avgWpm: 94, avgAccuracy: 97.2, totalGames: 1284, totalWins: 872, currentStreak: 7, longestStreak: 21 },
  });

  // ── Typing texts ───────────────────────────────────────────
  const texts = [
    { id: 'txt-easy-1',   content: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!', difficulty: 'easy',   category: 'general' },
    { id: 'txt-easy-2',   content: 'Simple words and short sentences help you practice typing speed and build confidence. Practice makes perfect. Keep going and never give up!', difficulty: 'easy',   category: 'general' },
    { id: 'txt-easy-3',   content: 'The sun rises in the east and sets in the west. Birds sing in the morning. Cats sleep in the afternoon. Dogs bark at the moon at night.', difficulty: 'easy',   category: 'nature' },
    { id: 'txt-medium-1', content: 'Programming is not about typing, it is about thinking. The best code is code that does not need to be written. Simple is better than complex, and explicit is better than implicit.', difficulty: 'medium', category: 'tech' },
    { id: 'txt-medium-2', content: 'The five boxing wizards jump quickly across the velvet floor. How vexingly quick daft zebras jump! Blowzy red vixens fight for a quick jump. Pack my box with five dozen liquor jugs.', difficulty: 'medium', category: 'general' },
    { id: 'txt-medium-3', content: 'The internet is becoming the town square for the global village of tomorrow. Technology is best when it brings people together. Innovation distinguishes between a leader and a follower.', difficulty: 'medium', category: 'quotes' },
    { id: 'txt-hard-1',   content: 'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and by opposing end them.', difficulty: 'hard',   category: 'literature' },
    { id: 'txt-hard-2',   content: 'In the beginning was the Word, and the Word was with God, and the Word was God. He was in the beginning with God. All things were made through him, and without him was not any thing made that was made.', difficulty: 'hard',   category: 'literature' },
    { id: 'txt-hard-3',   content: 'The fundamental theorem of calculus establishes the relationship between differentiation and integration, which are the two central operations of calculus. It demonstrates that these two operations are essentially inverses of each other.', difficulty: 'hard',   category: 'academic' },
  ];

  for (const t of texts) {
    const words = t.content.trim().split(/\s+/);
    await prisma.typingText.upsert({
      where: { id: t.id },
      update: {},
      create: { id: t.id, content: t.content, wordCount: words.length, charCount: t.content.length, difficulty: t.difficulty, category: t.category, isActive: true },
    });
  }

  // ── Quiz questions ─────────────────────────────────────────
  const questions = [
    { text: 'What does WPM stand for in typing?',             options: ['Words Per Minute','Words Per Moment','Writing Per Minute','Work Per Method'],      correctIndex: 0, subject: 'typing',       difficulty: 'easy'   },
    { text: 'Which programming language was created by Guido van Rossum?', options: ['Java','Ruby','Python','C++'],       correctIndex: 2, subject: 'programming', difficulty: 'easy'   },
    { text: 'What is the average typing speed of a professional typist?', options: ['40-50 WPM','60-75 WPM','100-120 WPM','150-200 WPM'], correctIndex: 1, subject: 'typing',       difficulty: 'medium' },
    { text: 'Which data structure uses LIFO (Last In, First Out)?', options: ['Queue','Array','Stack','Linked List'],   correctIndex: 2, subject: 'programming', difficulty: 'medium' },
    { text: 'What is the time complexity of binary search?',  options: ['O(1)','O(n)','O(log n)','O(n²)'],              correctIndex: 2, subject: 'programming', difficulty: 'hard'   },
    { text: 'What does HTTP stand for?',                       options: ['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transport Protocol','High Tech Transfer Protocol'], correctIndex: 0, subject: 'tech', difficulty: 'easy' },
    { text: 'Who invented the World Wide Web?',               options: ['Bill Gates','Tim Berners-Lee','Linus Torvalds','Steve Jobs'], correctIndex: 1, subject: 'tech', difficulty: 'easy' },
    { text: 'What is the fastest typing speed ever recorded?',options: ['150 WPM','200 WPM','212 WPM','312 WPM'],      correctIndex: 3, subject: 'typing',       difficulty: 'hard'   },
    { text: 'In React, which hook manages local component state?', options: ['useEffect','useReducer','useState','useContext'], correctIndex: 2, subject: 'programming', difficulty: 'medium' },
    { text: 'What does SQL stand for?',                        options: ['Structured Query Language','Simple Query Language','Structured Question Logic','Standard Query Language'], correctIndex: 0, subject: 'programming', difficulty: 'easy' },
    { text: 'Which keyboard layout is most common in English-speaking countries?', options: ['AZERTY','DVORAK','QWERTY','COLEMAK'], correctIndex: 2, subject: 'typing', difficulty: 'easy' },
    { text: 'What year was JavaScript first released?',        options: ['1991','1993','1995','1999'],                  correctIndex: 2, subject: 'programming', difficulty: 'medium' },
    { text: 'What does CSS stand for?',                        options: ['Computer Style Sheets','Creative Style Sheets','Cascading Style Sheets','Colorful Style Sheets'], correctIndex: 2, subject: 'tech', difficulty: 'easy' },
    { text: 'Which company created TypeScript?',               options: ['Google','Meta','Amazon','Microsoft'],          correctIndex: 3, subject: 'programming', difficulty: 'medium' },
    { text: 'What is the home row on a QWERTY keyboard?',     options: ['Q-W-E-R-T-Y','A-S-D-F-G-H','Z-X-C-V-B-N','T-Y-U-I-O-P'], correctIndex: 1, subject: 'typing', difficulty: 'easy' },
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = `q-seed-${String(i).padStart(3,'0')}`;
    await prisma.question.upsert({
      where: { id },
      update: {},
      create: { id, text: q.text, options: JSON.stringify(q.options), correctIndex: q.correctIndex, subject: q.subject, difficulty: q.difficulty, tags: '[]', isActive: true },
    });
  }

  // ── Achievements ───────────────────────────────────────────
  const achievements = [
    { key: 'first_login',      name: 'Welcome!',           description: 'Created your account',              icon: '👋', rarity: 'common',    category: 'general',  xpReward: 50,   coinReward: 50   },
    { key: 'first_race',       name: 'Rookie Racer',       description: 'Completed your first race',          icon: '🏁', rarity: 'common',    category: 'race',     xpReward: 25,   coinReward: 25   },
    { key: 'first_win',        name: 'First Win!',         description: 'Won your first race',               icon: '🏆', rarity: 'common',    category: 'race',     xpReward: 100,  coinReward: 100  },
    { key: 'games_10',         name: 'Getting Started',    description: 'Played 10 races',                   icon: '🎮', rarity: 'common',    category: 'race',     xpReward: 100,  coinReward: 100  },
    { key: 'games_50',         name: 'Regular Racer',      description: 'Played 50 races',                   icon: '⭐', rarity: 'uncommon',  category: 'race',     xpReward: 300,  coinReward: 300  },
    { key: 'games_100',        name: 'Veteran',            description: 'Played 100 races',                  icon: '🎖', rarity: 'rare',      category: 'race',     xpReward: 500,  coinReward: 500  },
    { key: 'games_500',        name: 'Elite Racer',        description: 'Played 500 races',                  icon: '💫', rarity: 'legendary', category: 'race',     xpReward: 1000, coinReward: 1000 },
    { key: 'wins_10',          name: 'On a Roll',          description: 'Won 10 races',                      icon: '🔥', rarity: 'common',    category: 'race',     xpReward: 200,  coinReward: 200  },
    { key: 'wins_50',          name: 'Dominator',          description: 'Won 50 races',                      icon: '👑', rarity: 'rare',      category: 'race',     xpReward: 500,  coinReward: 500  },
    { key: 'wins_100',         name: 'Legend',             description: 'Won 100 races',                     icon: '💎', rarity: 'legendary', category: 'race',     xpReward: 1000, coinReward: 1000 },
    { key: 'wpm_30',           name: 'Typing Novice',      description: 'Reached 30 WPM',                    icon: '⌨️', rarity: 'common',    category: 'speed',    xpReward: 50,   coinReward: 50   },
    { key: 'wpm_60',           name: 'Touch Typist',       description: 'Reached 60 WPM',                    icon: '✍️', rarity: 'common',    category: 'speed',    xpReward: 100,  coinReward: 100  },
    { key: 'wpm_80',           name: 'Fast Fingers',       description: 'Reached 80 WPM',                    icon: '⚡', rarity: 'uncommon',  category: 'speed',    xpReward: 200,  coinReward: 200  },
    { key: 'wpm_100',          name: 'Speed Typist',       description: 'Reached 100 WPM',                   icon: '🚀', rarity: 'rare',      category: 'speed',    xpReward: 300,  coinReward: 300  },
    { key: 'wpm_120',          name: 'Speed Racer',        description: 'Reached 120 WPM',                   icon: '💨', rarity: 'rare',      category: 'speed',    xpReward: 500,  coinReward: 500  },
    { key: 'wpm_140',          name: 'Speed Demon',        description: 'Reached 140 WPM',                   icon: '🌪', rarity: 'epic',      category: 'speed',    xpReward: 750,  coinReward: 750  },
    { key: 'wpm_160',          name: 'Supersonic',         description: 'Reached 160 WPM',                   icon: '🌟', rarity: 'legendary', category: 'speed',    xpReward: 1000, coinReward: 1000 },
    { key: 'wpm_200',          name: 'Superhuman',         description: 'Reached 200 WPM',                   icon: '🔮', rarity: 'legendary', category: 'speed',    xpReward: 2000, coinReward: 2000 },
    { key: 'accuracy_90',      name: 'Accurate',           description: '90%+ accuracy in a race',           icon: '🎯', rarity: 'common',    category: 'accuracy', xpReward: 75,   coinReward: 75   },
    { key: 'accuracy_95',      name: 'Sharpshooter',       description: '95%+ accuracy in a race',           icon: '🎯', rarity: 'uncommon',  category: 'accuracy', xpReward: 150,  coinReward: 150  },
    { key: 'perfect_accuracy', name: 'Perfectionist',      description: '100% accuracy in a race',           icon: '💯', rarity: 'rare',      category: 'accuracy', xpReward: 500,  coinReward: 500  },
    { key: 'streak_3',         name: 'On Fire',            description: '3-day login streak',                icon: '🔥', rarity: 'common',    category: 'streak',   xpReward: 75,   coinReward: 75   },
    { key: 'streak_7',         name: 'Week Warrior',       description: '7-day login streak',                icon: '📅', rarity: 'uncommon',  category: 'streak',   xpReward: 200,  coinReward: 200  },
    { key: 'streak_30',        name: 'Dedicated',          description: '30-day login streak',               icon: '🌙', rarity: 'rare',      category: 'streak',   xpReward: 500,  coinReward: 500  },
    { key: 'typing_first',     name: 'Typist',             description: 'Completed first typing race',       icon: '⌨️', rarity: 'common',    category: 'mode',     xpReward: 50,   coinReward: 50   },
    { key: 'quiz_first',       name: 'Quiz Starter',       description: 'Completed first quiz battle',       icon: '🧠', rarity: 'common',    category: 'mode',     xpReward: 50,   coinReward: 50   },
    { key: 'level_10',         name: 'Level 10',           description: 'Reached level 10',                  icon: '🔟', rarity: 'uncommon',  category: 'general',  xpReward: 200,  coinReward: 200  },
    { key: 'level_25',         name: 'Level 25',           description: 'Reached level 25',                  icon: '🌠', rarity: 'rare',      category: 'general',  xpReward: 500,  coinReward: 500  },
    { key: 'level_50',         name: 'Level 50',           description: 'Reached level 50',                  icon: '👑', rarity: 'legendary', category: 'general',  xpReward: 1000, coinReward: 1000 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: {}, create: a });
  }

  // Give demo user a few achievements
  for (const key of ['first_login', 'first_race', 'first_win', 'wpm_100', 'games_10', 'typing_first']) {
    const ach = await prisma.achievement.findUnique({ where: { key } });
    if (ach) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: demo.id, achievementId: ach.id } },
        update: {},
        create: { userId: demo.id, achievementId: ach.id },
      });
    }
  }

  // ── Shop items ─────────────────────────────────────────────
  const shopItems = [
    { id: 'item-trail-fire', name: 'Fire Trail',     description: 'Leave a trail of flames as you type', type: 'trail',  rarity: 'uncommon', coinPrice: 500,  gemPrice: 0,   isFeatured: false },
    { id: 'item-trail-neon', name: 'Neon Glow',      description: 'Cyberpunk neon glow trail',            type: 'trail',  rarity: 'rare',     coinPrice: 1500, gemPrice: 0,   isFeatured: true  },
    { id: 'item-trail-rain', name: 'Raindrop',        description: 'Cool water droplet trail effect',      type: 'trail',  rarity: 'common',   coinPrice: 250,  gemPrice: 0,   isFeatured: false },
    { id: 'item-cursor-zap', name: 'Lightning Cursor', description: 'Electric cursor animation',           type: 'cursor', rarity: 'uncommon', coinPrice: 400,  gemPrice: 0,   isFeatured: false },
    { id: 'item-cursor-star', name: 'Star Cursor',    description: 'Sparkly star cursor effect',           type: 'cursor', rarity: 'common',   coinPrice: 200,  gemPrice: 0,   isFeatured: false },
    { id: 'item-theme-midnight', name: 'Midnight',    description: 'Ultra dark midnight typing theme',     type: 'theme',  rarity: 'common',   coinPrice: 200,  gemPrice: 0,   isFeatured: false },
    { id: 'item-theme-neon', name: 'Neon City',       description: 'Bright neon cyberpunk aesthetics',     type: 'theme',  rarity: 'rare',     coinPrice: 1000, gemPrice: 0,   isFeatured: true  },
    { id: 'item-theme-forest', name: 'Forest',        description: 'Calm natural green theme',             type: 'theme',  rarity: 'common',   coinPrice: 300,  gemPrice: 0,   isFeatured: false },
    { id: 'item-avatar-pro', name: 'PRO Badge',       description: 'Gold PRO badge on your profile',       type: 'badge',  rarity: 'epic',     coinPrice: 5000, gemPrice: 50,  isFeatured: true  },
    { id: 'item-avatar-crown', name: 'Crown Avatar',  description: 'Royal crown avatar frame',             type: 'badge',  rarity: 'rare',     coinPrice: 2500, gemPrice: 25,  isFeatured: false },
  ];

  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i];
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, isActive: true, sortOrder: i, metadata: '{}' },
    });
  }

  // ── Feature flags ──────────────────────────────────────────
  const flags = [
    { key: 'typing_race',     name: 'Typing Race',      description: 'Classic real-time typing race mode',   enabled: true  },
    { key: 'quiz_battle',     name: 'Quiz Battle',      description: 'Multiplayer quiz battle mode',          enabled: true  },
    { key: 'matchmaking',     name: 'Matchmaking',      description: 'ELO-based ranked matchmaking',          enabled: true  },
    { key: 'shop',            name: 'Cosmetics Shop',   description: 'In-game cosmetics shop',                enabled: true  },
    { key: 'achievements',    name: 'Achievements',     description: 'Achievement / badge system',            enabled: true  },
    { key: 'notifications',   name: 'Notifications',    description: 'In-app push notifications',             enabled: true  },
    { key: 'leaderboard',     name: 'Leaderboard',      description: 'Global and weekly leaderboards',        enabled: true  },
    { key: 'tournaments',     name: 'Tournaments',      description: 'Bracket-style tournaments',             enabled: false },
    { key: 'anti_cheat',      name: 'Anti-Cheat',       description: 'Real-time WPM anomaly detection',       enabled: true  },
    { key: 'daily_challenge', name: 'Daily Challenge',  description: 'Curated daily typing challenge',        enabled: false },
  ];

  for (const f of flags) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, update: {}, create: { ...f, updatedAt: new Date() } });
  }

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────');
  console.log('  Admin : admin@quizracer.io / Admin123!');
  console.log('  Player: demo@quizracer.io  / Demo1234!');
  console.log('─────────────────────────────────');
}

main().catch(console.error).finally(() => prisma.$disconnect());
