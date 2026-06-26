const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@quizracer.com' }
  });
  
  if (admin) {
    console.log('Admin user found:');
    console.log('Email:', admin.email);
    console.log('Password hash:', admin.password);
    console.log('Role:', admin.role);
  } else {
    console.log('No admin user found! Creating one...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.create({
      data: {
        email: 'admin@quizracer.com',
        password: hashedPassword,
        username: 'Admin',
        role: 'admin',
        coins: 1000
      }
    });
    
    console.log('Admin user created with password: admin123');
  }
  
  await prisma.();
}

checkAdmin();
