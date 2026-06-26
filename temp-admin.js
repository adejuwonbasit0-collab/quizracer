const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();
(async () => {
  const hash = await argon2.hash('admin123');
  const user = await prisma.user.upsert({
    where: { email: 'adejuwonbasit0@gmail.com' },
    update: { passwordHash: hash },
    create: {
      email: 'adejuwonbasit0@gmail.com',
      username: 'adejuwonbasit0',
      displayName: 'Admin User',
      passwordHash: hash,
      role: 'ADMIN',
      coins: 1000,
      gems: 100,
    },
  });
  await prisma.userStats.create({ data: { userId: user.id } });
  console.log('✅ Admin user updated/created with password: admin123');
})();
