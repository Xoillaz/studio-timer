import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 创建管理员 (密码: admin123)
  const admin = await prisma.admin.findUnique({
    where: { username: 'admin' },
  });

  if (!admin) {
    await prisma.admin.create({
      data: {
        username: 'admin',
        passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // admin123
        realName: '系统管理员',
        role: 'admin',
      },
    });
    console.log('Admin created');
  }

  // 创建场地 - 5个价格梯度
  const venues = [
    { name: 'A棚-经济棚', pricePerHour: 100, description: '30平米经济棚，适合初创团队' },
    { name: 'B棚-标准棚', pricePerHour: 200, description: '50平米标准棚，适合短视频拍摄' },
    { name: 'C棚-专业棚', pricePerHour: 300, description: '80平米专业棚，适合电商场景' },
    { name: 'D棚-高端棚', pricePerHour: 400, description: '100平米高端棚，适合品牌拍摄' },
    { name: 'E棚-旗舰棚', pricePerHour: 500, description: '150平米旗舰棚，可用于TVC拍摄' },
  ];

  for (const venue of venues) {
    const existing = await prisma.venue.findFirst({
      where: { name: venue.name },
    });
    if (!existing) {
      await prisma.venue.create({ data: venue });
    }
  }
  console.log('Venues created');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
