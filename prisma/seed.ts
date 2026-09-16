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

  // 创建增值服务 - 设备
  const equipmentItems = [
    { name: '专业摄像机', pricePerUse: 100, category: 'equipment', remark: 'Sony FX6', sortOrder: 1 },
    { name: '单反相机', pricePerUse: 50, category: 'equipment', remark: 'Canon R5', sortOrder: 2 },
    { name: '微单相机', pricePerUse: 30, category: 'equipment', remark: 'Sony A7M4', sortOrder: 3 },
    { name: '稳定器', pricePerUse: 30, category: 'equipment', remark: 'DJI RS3', sortOrder: 4 },
    { name: '灯光设备', pricePerUse: 50, category: 'equipment', remark: 'LED 补光灯', sortOrder: 5 },
    { name: '反光板', pricePerUse: 10, category: 'equipment', remark: '60cm 便携', sortOrder: 6 },
    { name: '三脚架', pricePerUse: 15, category: 'equipment', remark: '专业级', sortOrder: 7 },
    { name: '监视器', pricePerUse: 40, category: 'equipment', remark: '7寸 HDMI', sortOrder: 8 },
  ];

  // 创建增值服务 - 耗材
  const consumableItems = [
    { name: '充电电池', pricePerUse: 5, category: 'consumables', remark: 'AA/AAA', sortOrder: 1 },
    { name: '存储卡', pricePerUse: 10, category: 'consumables', remark: '64GB', sortOrder: 2 },
    { name: '电池', pricePerUse: 20, category: 'consumables', remark: '相机电池', sortOrder: 3 },
    { name: '清洁套装', pricePerUse: 10, category: 'consumables', remark: '镜头纸/气吹', sortOrder: 4 },
    { name: '无线麦克风', pricePerUse: 30, category: 'consumables', remark: '一拖二', sortOrder: 5 },
  ];

  for (const item of [...equipmentItems, ...consumableItems]) {
    const existing = await prisma.vasService.findFirst({
      where: { name: item.name },
    });
    if (!existing) {
      await prisma.vasService.create({ data: item });
    }
  }
  console.log('VasServices created');

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
