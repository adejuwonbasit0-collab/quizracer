const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizracer.com' },
    update: { 
      password: hashedPassword,
      role: 'admin'
    },
    create: {
      email: 'admin@quizracer.com',
      password: hashedPassword,
      username: 'Admin',
      role: 'admin',
      coins: 1000
    }
  });
  
  console.log('Admin fixed!');
  console.log('Email: admin@quizracer.com');
  console.log('Password: admin123');
  await prisma.();
}

fixAdmin();
