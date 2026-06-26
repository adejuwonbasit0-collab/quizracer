const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizracer.com' },
    update: {},
    create: {
      email: 'admin@quizracer.com',
      password: hashedPassword,
      username: 'Admin',
      role: 'admin',
      coins: 1000,
      totalGames: 0,
      totalWins: 0,
      totalCorrect: 0,
      totalAnswers: 0,
      bestWpm: 0
    }
  });
  
  console.log('✅ Admin user created:', admin.email);
  
  // Create sample questions
  const questions = [
    {
      subject: 'General',
      difficulty: 'easy',
      questionText: 'What is 2 + 2?',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'B'
    },
    {
      subject: 'General',
      difficulty: 'easy',
      questionText: 'What is the capital of France?',
      optionA: 'London',
      optionB: 'Berlin',
      optionC: 'Paris',
      optionD: 'Madrid',
      correctAnswer: 'C'
    },
    {
      subject: 'Science',
      difficulty: 'medium',
      questionText: 'Which planet is known as the Red Planet?',
      optionA: 'Mars',
      optionB: 'Jupiter',
      optionC: 'Venus',
      optionD: 'Saturn',
      correctAnswer: 'A'
    },
    {
      subject: 'Science',
      difficulty: 'easy',
      questionText: 'What is H2O commonly known as?',
      optionA: 'Oxygen',
      optionB: 'Hydrogen',
      optionC: 'Water',
      optionD: 'Salt',
      correctAnswer: 'C'
    },
    {
      subject: 'History',
      difficulty: 'medium',
      questionText: 'Who painted the Mona Lisa?',
      optionA: 'Van Gogh',
      optionB: 'Picasso',
      optionC: 'Da Vinci',
      optionD: 'Rembrandt',
      correctAnswer: 'C'
    }
  ];
  
  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: undefined },
      update: {},
      create: q
    });
  }
  
  console.log(✅ Created  sample questions);
  console.log('🎉 Database seeding completed!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.();
  });
