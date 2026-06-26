const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function createAdmin() {
  const passwordHash = await argon2.hash('baskid555');
  const user = await prisma.user.upsert({
    where: { email: 'adejuwonbasit0@gmail.com' },
    update: {},
    create: {
      email: 'adejuwonbasit0@gmail.com',
      username: 'adejuwonbasit0',
      displayName: 'Admin User',
      passwordHash,
      role: 'ADMIN',
      coins: 1000,
      gems: 100,
    },
  });
  await prisma.userStats.create({ data: { userId: user.id } });
  console.log('✅ Admin user created:', user.email);
  await prisma.$disconnect();
}

createAdmin();
