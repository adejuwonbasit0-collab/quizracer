const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany();
  console.log('Users in database:', users.length);
  for (const user of users) {
    console.log('---');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password hash:', user.password.substring(0, 20) + '...');
  }
  await prisma.();
}

checkUsers();
