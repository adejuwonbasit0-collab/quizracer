const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@quizracer.com' },
    update: {},
    create: {
      email: 'admin@quizracer.com',
      password: hashedPassword,
      username: 'Admin',
      role: 'admin',
      coins: 1000
    }
  });
  console.log('Admin user created');
  
  // Clear existing questions
  await prisma.question.deleteMany({});
  console.log('Cleared existing questions');
  
  // Create questions
  const questions = [
    { subject: 'General', difficulty: 'easy', questionText: 'What is 2 + 2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctAnswer: 'B' },
    { subject: 'General', difficulty: 'easy', questionText: 'What is the capital of France?', optionA: 'London', optionB: 'Berlin', optionC: 'Paris', optionD: 'Madrid', correctAnswer: 'C' },
    { subject: 'Science', difficulty: 'medium', questionText: 'Which planet is known as the Red Planet?', optionA: 'Mars', optionB: 'Jupiter', optionC: 'Venus', optionD: 'Saturn', correctAnswer: 'A' },
    { subject: 'Science', difficulty: 'easy', questionText: 'What is H2O?', optionA: 'Oxygen', optionB: 'Hydrogen', optionC: 'Water', optionD: 'Salt', correctAnswer: 'C' },
    { subject: 'History', difficulty: 'medium', questionText: 'Who painted the Mona Lisa?', optionA: 'Van Gogh', optionB: 'Picasso', optionC: 'Da Vinci', optionD: 'Rembrandt', correctAnswer: 'C' }
  ];
  
  for (const q of questions) {
    await prisma.question.create({ data: q });
  }
  
  console.log(`Created ${questions.length} questions`);
  console.log('Seeding completed successfully');
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });