import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding QuizRacer database...');

  // ── YOUR admin account ──────────────────────────────────────
  const yourHash = await argon2.hash('baskid555');
  const admin = await prisma.user.upsert({
    where: { email: 'adejuwonbasit0@gmail.com' },
    update: { passwordHash: yourHash, role: 'SUPERADMIN' },
    create: {
      email: 'adejuwonbasit0@gmail.com',
      username: 'bazillin',
      displayName: 'Bazillin',
      passwordHash: yourHash,
      role: 'SUPERADMIN',
      level: 99,
      xp: 999999,
      xpToNextLevel: 999999,
      coins: 99999,
      gems: 9999,
      isPremium: true,
      isVerified: true,
      rating: 3000,
    },
  });

  await prisma.userStats.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, bestWpm: 200, avgWpm: 180, avgAccuracy: 99, totalGames: 500, totalWins: 450 },
  });

  console.log('✅ Admin account: adejuwonbasit0@gmail.com / baskid555');

  // ── Demo player ─────────────────────────────────────────────
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

  // ── Typing texts ─────────────────────────────────────────────
  const texts = [
    { id: 'txt-easy-1',   content: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!', difficulty: 'easy',   category: 'general',    wordCount: 21, charCount: 117 },
    { id: 'txt-easy-2',   content: 'Simple words and short sentences help you practice typing speed and build confidence. Practice makes perfect. Keep going and never give up on your goals!', difficulty: 'easy', category: 'general', wordCount: 27, charCount: 157 },
    { id: 'txt-easy-3',   content: 'The sun rises in the east and sets in the west every single day. Birds sing in the morning. Cats sleep in the afternoon. Dogs bark at the moon at night.', difficulty: 'easy', category: 'nature', wordCount: 30, charCount: 157 },
    { id: 'txt-medium-1', content: 'Programming is not about typing, it is about thinking. The best code is code that does not need to be written. Simple is better than complex, and explicit is better than implicit in all things.', difficulty: 'medium', category: 'tech', wordCount: 35, charCount: 196 },
    { id: 'txt-medium-2', content: 'The internet is becoming the town square for the global village of tomorrow. Technology is best when it brings people together across distances and time zones. Innovation distinguishes between a leader and a follower.', difficulty: 'medium', category: 'quotes', wordCount: 36, charCount: 219 },
    { id: 'txt-medium-3', content: 'In a world where you can be anything, be kind. The smallest act of kindness is worth more than the grandest intention. Spread positivity wherever you go and watch the world change around you.', difficulty: 'medium', category: 'quotes', wordCount: 35, charCount: 196 },
    { id: 'txt-hard-1',   content: 'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and by opposing end them.', difficulty: 'hard', category: 'literature', wordCount: 37, charCount: 200 },
    { id: 'txt-hard-2',   content: 'The fundamental theorem of calculus establishes the relationship between differentiation and integration, which are the two central operations of calculus. It demonstrates that these two operations are essentially inverses of each other in mathematics.', difficulty: 'hard', category: 'academic', wordCount: 40, charCount: 249 },
    { id: 'txt-hard-3',   content: 'Quantum entanglement is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in such a way that the quantum state of each particle cannot be described independently of the state of the others.', difficulty: 'hard', category: 'science', wordCount: 41, charCount: 249 },
  ];

  for (const t of texts) {
    await prisma.typingText.upsert({
      where: { id: t.id }, update: {},
      create: { id: t.id, content: t.content, wordCount: t.wordCount, charCount: t.charCount, difficulty: t.difficulty, category: t.category, isActive: true },
    });
  }

  // ── Quiz questions (with custom subjects user can add more of) ─
  const questions = [
    { id: 'q-001', text: 'What does WPM stand for in typing?',                 options: ['Words Per Minute','Words Per Moment','Writing Per Minute','Work Per Mile'],           correctIndex: 0, subject: 'Typing',       difficulty: 'easy'   },
    { id: 'q-002', text: 'Which programming language was created by Guido van Rossum?', options: ['Java','Ruby','Python','C++'],                                                correctIndex: 2, subject: 'Programming', difficulty: 'easy'   },
    { id: 'q-003', text: 'What is the average typing speed of a professional typist?', options: ['40-50 WPM','60-75 WPM','100-120 WPM','150-200 WPM'],                        correctIndex: 1, subject: 'Typing',       difficulty: 'medium' },
    { id: 'q-004', text: 'Which data structure uses LIFO (Last In, First Out)?', options: ['Queue','Array','Stack','Linked List'],                                               correctIndex: 2, subject: 'Programming', difficulty: 'medium' },
    { id: 'q-005', text: 'What is the time complexity of binary search?',        options: ['O(1)','O(n)','O(log n)','O(n²)'],                                                   correctIndex: 2, subject: 'Programming', difficulty: 'hard'   },
    { id: 'q-006', text: 'What does HTTP stand for?',                            options: ['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transport Protocol','High Tech Transfer Protocol'], correctIndex: 0, subject: 'Technology', difficulty: 'easy' },
    { id: 'q-007', text: 'Who invented the World Wide Web?',                     options: ['Bill Gates','Tim Berners-Lee','Linus Torvalds','Steve Jobs'],                       correctIndex: 1, subject: 'Technology', difficulty: 'easy'   },
    { id: 'q-008', text: 'What is the fastest typing speed ever recorded?',      options: ['150 WPM','200 WPM','212 WPM','312 WPM'],                                           correctIndex: 3, subject: 'Typing',       difficulty: 'hard'   },
    { id: 'q-009', text: 'In React, which hook manages local component state?',  options: ['useEffect','useReducer','useState','useContext'],                                    correctIndex: 2, subject: 'Programming', difficulty: 'medium' },
    { id: 'q-010', text: 'What does SQL stand for?',                             options: ['Structured Query Language','Simple Query Language','Structured Question Logic','Standard Query Language'], correctIndex: 0, subject: 'Programming', difficulty: 'easy' },
    { id: 'q-011', text: 'Which keyboard layout is most common in English?',     options: ['AZERTY','DVORAK','QWERTY','COLEMAK'],                                               correctIndex: 2, subject: 'Typing',       difficulty: 'easy'   },
    { id: 'q-012', text: 'What year was JavaScript first released?',             options: ['1991','1993','1995','1999'],                                                        correctIndex: 2, subject: 'Programming', difficulty: 'medium' },
    { id: 'q-013', text: 'What does CSS stand for?',                             options: ['Computer Style Sheets','Creative Style Sheets','Cascading Style Sheets','Colorful Style Sheets'], correctIndex: 2, subject: 'Technology', difficulty: 'easy' },
    { id: 'q-014', text: 'Which company created TypeScript?',                    options: ['Google','Meta','Amazon','Microsoft'],                                                correctIndex: 3, subject: 'Programming', difficulty: 'medium' },
    { id: 'q-015', text: 'What is the home row on a QWERTY keyboard?',          options: ['Q-W-E-R-T-Y','A-S-D-F-G-H','Z-X-C-V-B-N','T-Y-U-I-O-P'],                       correctIndex: 1, subject: 'Typing',       difficulty: 'easy'   },
    { id: 'q-016', text: 'What planet is known as the Red Planet?',              options: ['Venus','Mars','Jupiter','Saturn'],                                                   correctIndex: 1, subject: 'Science',      difficulty: 'easy'   },
    { id: 'q-017', text: 'What is the chemical symbol for Gold?',                options: ['Go','Gd','Au','Ag'],                                                                correctIndex: 2, subject: 'Science',      difficulty: 'medium' },
    { id: 'q-018', text: 'Who painted the Mona Lisa?',                           options: ['Michelangelo','Vincent van Gogh','Leonardo da Vinci','Pablo Picasso'],              correctIndex: 2, subject: 'General Knowledge', difficulty: 'easy' },
    { id: 'q-019', text: 'What is the capital of Japan?',                        options: ['Beijing','Seoul','Bangkok','Tokyo'],                                                 correctIndex: 3, subject: 'Geography',    difficulty: 'easy'   },
    { id: 'q-020', text: 'How many sides does a hexagon have?',                  options: ['5','6','7','8'],                                                                    correctIndex: 1, subject: 'Mathematics',  difficulty: 'easy'   },
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id }, update: {},
      create: { id: q.id, text: q.text, options: JSON.stringify(q.options), correctIndex: q.correctIndex, subject: q.subject, difficulty: q.difficulty, tags: '[]', isActive: true },
    });
  }

  // ── Achievements ─────────────────────────────────────────────
  const achievements = [
    { key: 'first_login',       name: 'Welcome!',           description: 'Created your account',              icon: '👋', rarity: 'common',    category: 'general',        xpReward: 50,   coinReward: 50   },
    { key: 'first_race',        name: 'Rookie Racer',        description: 'Completed your first race',         icon: '🏁', rarity: 'common',    category: 'race',           xpReward: 25,   coinReward: 25   },
    { key: 'first_win',         name: 'First Win!',          description: 'Won your first race',               icon: '🏆', rarity: 'common',    category: 'race',           xpReward: 100,  coinReward: 100  },
    { key: 'games_10',          name: 'Getting Started',     description: 'Played 10 races',                   icon: '🎮', rarity: 'common',    category: 'race',           xpReward: 100,  coinReward: 100  },
    { key: 'games_50',          name: 'Regular Racer',       description: 'Played 50 races',                   icon: '⭐', rarity: 'uncommon',  category: 'race',           xpReward: 300,  coinReward: 300  },
    { key: 'games_100',         name: 'Veteran',             description: 'Played 100 races',                  icon: '🎖', rarity: 'rare',      category: 'race',           xpReward: 500,  coinReward: 500  },
    { key: 'wins_10',           name: 'On a Roll',           description: 'Won 10 races',                      icon: '🔥', rarity: 'common',    category: 'race',           xpReward: 200,  coinReward: 200  },
    { key: 'wins_50',           name: 'Dominator',           description: 'Won 50 races',                      icon: '👑', rarity: 'rare',      category: 'race',           xpReward: 500,  coinReward: 500  },
    { key: 'wins_100',          name: 'Legend',              description: 'Won 100 races',                     icon: '💎', rarity: 'legendary', category: 'race',           xpReward: 1000, coinReward: 1000 },
    { key: 'wpm_30',            name: 'Typing Novice',       description: 'Reached 30 WPM',                    icon: '⌨️', rarity: 'common',    category: 'speed',          xpReward: 50,   coinReward: 50   },
    { key: 'wpm_60',            name: 'Touch Typist',        description: 'Reached 60 WPM',                    icon: '✍️', rarity: 'common',    category: 'speed',          xpReward: 100,  coinReward: 100  },
    { key: 'wpm_80',            name: 'Fast Fingers',        description: 'Reached 80 WPM',                    icon: '⚡', rarity: 'uncommon',  category: 'speed',          xpReward: 200,  coinReward: 200  },
    { key: 'wpm_100',           name: 'Speed Typist',        description: 'Reached 100 WPM',                   icon: '🚀', rarity: 'rare',      category: 'speed',          xpReward: 300,  coinReward: 300  },
    { key: 'wpm_120',           name: 'Speed Racer',         description: 'Reached 120 WPM',                   icon: '💨', rarity: 'rare',      category: 'speed',          xpReward: 500,  coinReward: 500  },
    { key: 'wpm_140',           name: 'Speed Demon',         description: 'Reached 140 WPM',                   icon: '🌪', rarity: 'epic',      category: 'speed',          xpReward: 750,  coinReward: 750  },
    { key: 'accuracy_95',       name: 'Sharpshooter',        description: '95%+ accuracy in a race',           icon: '🎯', rarity: 'uncommon',  category: 'accuracy',       xpReward: 150,  coinReward: 150  },
    { key: 'perfect_accuracy',  name: 'Perfectionist',       description: '100% accuracy in a race',           icon: '💯', rarity: 'rare',      category: 'accuracy',       xpReward: 500,  coinReward: 500  },
    { key: 'streak_7',          name: 'Week Warrior',        description: '7-day login streak',                icon: '📅', rarity: 'uncommon',  category: 'streak',         xpReward: 200,  coinReward: 200  },
    { key: 'streak_30',         name: 'Dedicated',           description: '30-day login streak',               icon: '🌙', rarity: 'rare',      category: 'streak',         xpReward: 500,  coinReward: 500  },
    { key: 'typing_first',      name: 'Typist',              description: 'Completed first typing race',       icon: '⌨️', rarity: 'common',    category: 'mode',           xpReward: 50,   coinReward: 50   },
    { key: 'quiz_first',        name: 'Quiz Starter',        description: 'Completed first quiz battle',       icon: '🧠', rarity: 'common',    category: 'mode',           xpReward: 50,   coinReward: 50   },
    { key: 'level_10',          name: 'Level 10',            description: 'Reached level 10',                  icon: '🔟', rarity: 'uncommon',  category: 'general',        xpReward: 200,  coinReward: 200  },
    { key: 'level_25',          name: 'Level 25',            description: 'Reached level 25',                  icon: '🌠', rarity: 'rare',      category: 'general',        xpReward: 500,  coinReward: 500  },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: {}, create: a });
  }

  // Give admin all achievements
  for (const a of achievements) {
    const ach = await prisma.achievement.findUnique({ where: { key: a.key } });
    if (ach) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: admin.id, achievementId: ach.id } },
        update: {}, create: { userId: admin.id, achievementId: ach.id },
      });
    }
  }

  // ── Shop items ────────────────────────────────────────────────
  const shopItems = [
    { id: 'item-trail-fire',   name: 'Fire Trail',      description: 'Blazing fire trail as you type',      type: 'trail',  rarity: 'uncommon', coinPrice: 500,  gemPrice: 0,  isFeatured: false },
    { id: 'item-trail-neon',   name: 'Neon Glow',       description: 'Cyberpunk neon glow trail',            type: 'trail',  rarity: 'rare',     coinPrice: 1500, gemPrice: 0,  isFeatured: true  },
    { id: 'item-trail-rain',   name: 'Raindrop',         description: 'Cool water droplet trail effect',      type: 'trail',  rarity: 'common',   coinPrice: 250,  gemPrice: 0,  isFeatured: false },
    { id: 'item-cursor-zap',   name: 'Lightning Cursor', description: 'Electric cursor animation',           type: 'cursor', rarity: 'uncommon', coinPrice: 400,  gemPrice: 0,  isFeatured: false },
    { id: 'item-theme-midnight',name: 'Midnight',        description: 'Ultra dark midnight typing theme',    type: 'theme',  rarity: 'common',   coinPrice: 200,  gemPrice: 0,  isFeatured: false },
    { id: 'item-theme-neon',   name: 'Neon City',        description: 'Bright neon cyberpunk aesthetics',    type: 'theme',  rarity: 'rare',     coinPrice: 1000, gemPrice: 0,  isFeatured: true  },
    { id: 'item-theme-forest', name: 'Forest',           description: 'Calm natural green theme',            type: 'theme',  rarity: 'common',   coinPrice: 300,  gemPrice: 0,  isFeatured: false },
    { id: 'item-badge-pro',    name: 'PRO Badge',        description: 'Gold PRO badge on your profile',      type: 'badge',  rarity: 'epic',     coinPrice: 5000, gemPrice: 50, isFeatured: true  },
    { id: 'item-badge-crown',  name: 'Crown Badge',      description: 'Royal crown avatar frame',            type: 'badge',  rarity: 'rare',     coinPrice: 2500, gemPrice: 25, isFeatured: false },
  ];

  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i];
    await prisma.shopItem.upsert({
      where: { id: item.id }, update: {},
      create: { ...item, isActive: true, sortOrder: i, metadata: '{}' },
    });
  }

  // ── Site settings ─────────────────────────────────────────────
  const settings = [
    // General
    { key: 'site_name',            value: 'QuizRacer',                      category: 'general', label: 'Site Name',              type: 'text'    },
    { key: 'site_tagline',         value: 'Race Friends with Your Keyboard', category: 'general', label: 'Site Tagline',           type: 'text'    },
    { key: 'site_description',     value: 'Real-time multiplayer typing races and quiz battles.', category: 'general', label: 'Meta Description', type: 'textarea' },
    { key: 'maintenance_mode',     value: 'false',                          category: 'general', label: 'Maintenance Mode',       type: 'boolean' },
    { key: 'allow_registration',   value: 'true',                           category: 'general', label: 'Allow Registration',     type: 'boolean' },
    { key: 'require_email_verify', value: 'false',                          category: 'general', label: 'Require Email Verify',   type: 'boolean' },
    // Appearance
    { key: 'primary_color',        value: '#4f46e5',                        category: 'appearance', label: 'Primary Color',       type: 'color'   },
    { key: 'accent_color',         value: '#00f5ff',                        category: 'appearance', label: 'Accent Color',        type: 'color'   },
    { key: 'logo_url',             value: '',                               category: 'appearance', label: 'Logo URL',            type: 'text'    },
    { key: 'favicon_url',          value: '',                               category: 'appearance', label: 'Favicon URL',         type: 'text'    },
    { key: 'default_theme',        value: 'dark',                           category: 'appearance', label: 'Default Theme',       type: 'select'  },
    // Email
    { key: 'smtp_host',            value: '',                               category: 'email', label: 'SMTP Host',                type: 'text'    },
    { key: 'smtp_port',            value: '587',                            category: 'email', label: 'SMTP Port',                type: 'number'  },
    { key: 'smtp_user',            value: '',                               category: 'email', label: 'SMTP Username',            type: 'text'    },
    { key: 'smtp_pass',            value: '',                               category: 'email', label: 'SMTP Password',            type: 'password'},
    { key: 'email_from',           value: 'noreply@quizracer.io',           category: 'email', label: 'From Address',             type: 'text'    },
    { key: 'email_from_name',      value: 'QuizRacer',                      category: 'email', label: 'From Name',                type: 'text'    },
    // Payments
    { key: 'stripe_enabled',       value: 'false',                          category: 'payments', label: 'Enable Stripe',         type: 'boolean' },
    { key: 'stripe_public_key',    value: '',                               category: 'payments', label: 'Stripe Public Key',     type: 'text'    },
    { key: 'stripe_secret_key',    value: '',                               category: 'payments', label: 'Stripe Secret Key',     type: 'password'},
    { key: 'currency',             value: 'usd',                            category: 'payments', label: 'Currency',              type: 'text'    },
    // Subscriptions
    { key: 'sub_free_races_daily', value: '10',                             category: 'subscriptions', label: 'Free Daily Races', type: 'number'  },
    { key: 'sub_pro_price_monthly',value: '9.99',                           category: 'subscriptions', label: 'Pro Monthly Price (USD)', type: 'number' },
    { key: 'sub_pro_price_yearly', value: '79.99',                         category: 'subscriptions', label: 'Pro Yearly Price (USD)',  type: 'number' },
    { key: 'sub_pro_features',     value: 'Unlimited races,No ads,Custom themes,Priority matchmaking,Analytics', category: 'subscriptions', label: 'Pro Features (comma-separated)', type: 'textarea' },
    // Pages
    { key: 'hero_title',           value: 'Race Friends with Your Keyboard', category: 'pages', label: 'Homepage Hero Title',    type: 'text'    },
    { key: 'hero_subtitle',        value: 'Real-time multiplayer typing races and quiz battles',  category: 'pages', label: 'Homepage Hero Subtitle', type: 'text' },
    { key: 'footer_text',          value: '© 2026 QuizRacer. All rights reserved.',              category: 'pages', label: 'Footer Text',           type: 'text'    },
    { key: 'show_leaderboard',     value: 'true',                           category: 'pages', label: 'Show Leaderboard',         type: 'boolean' },
    { key: 'show_shop',            value: 'true',                           category: 'pages', label: 'Show Shop',                type: 'boolean' },
    // Game settings
    { key: 'max_players_per_room', value: '8',                              category: 'game', label: 'Max Players Per Room',      type: 'number'  },
    { key: 'countdown_seconds',    value: '3',                              category: 'game', label: 'Countdown Seconds',         type: 'number'  },
    { key: 'anti_cheat_wpm_limit', value: '250',                           category: 'game', label: 'Anti-Cheat WPM Limit',      type: 'number'  },
    { key: 'quiz_time_per_round',  value: '20',                             category: 'game', label: 'Quiz Seconds Per Question', type: 'number'  },
    { key: 'quiz_questions_count', value: '10',                             category: 'game', label: 'Quiz Questions Per Game',   type: 'number'  },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // ── Feature flags ─────────────────────────────────────────────
  const flags = [
    { key: 'typing_race',     name: 'Typing Race',      description: 'Classic real-time typing race mode',   enabled: true  },
    { key: 'quiz_battle',     name: 'Quiz Battle',      description: 'Multiplayer quiz battle mode',          enabled: true  },
    { key: 'matchmaking',     name: 'Matchmaking',      description: 'ELO-based ranked matchmaking',          enabled: true  },
    { key: 'shop',            name: 'Cosmetics Shop',   description: 'In-game cosmetics shop',                enabled: true  },
    { key: 'achievements',    name: 'Achievements',     description: 'Achievement / badge system',            enabled: true  },
    { key: 'notifications',   name: 'Notifications',    description: 'In-app notifications',                  enabled: true  },
    { key: 'leaderboard',     name: 'Leaderboard',      description: 'Global and weekly leaderboards',        enabled: true  },
    { key: 'tournaments',     name: 'Tournaments',      description: 'Bracket-style tournaments (coming soon)',enabled: false },
    { key: 'anti_cheat',      name: 'Anti-Cheat',       description: 'Real-time WPM anomaly detection',       enabled: true  },
    { key: 'daily_challenge', name: 'Daily Challenge',  description: 'Curated daily typing challenge',        enabled: false },
    { key: 'subscriptions',   name: 'Subscriptions',    description: 'Pro subscription plans',                enabled: false },
    { key: 'email_verify',    name: 'Email Verification',description: 'Require email verification on signup', enabled: false },
  ];

  for (const f of flags) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, update: {}, create: { ...f, updatedAt: new Date() } });
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('────────────────────────────────────────');
  console.log('  Admin: adejuwonbasit0@gmail.com / baskid555');
  console.log('  Demo:  demo@quizracer.io / Demo1234!');
  console.log('────────────────────────────────────────');
}

main().catch(console.error).finally(() => prisma.$disconnect());