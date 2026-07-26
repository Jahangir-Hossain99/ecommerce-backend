import prisma from '../src/config/prisma.js';

import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@racoai.com' },
    update: {},
    create: {
      email: 'admin@racoai.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // 2. Create Category Hierarchy for DFS Test
  const electronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const laptops = await prisma.category.create({ data: { name: 'Laptops', parentId: electronics.id } });
  const gamingLaptops = await prisma.category.create({ data: { name: 'Gaming Laptops', parentId: laptops.id } });

  // 3. Create Sample Products
  await prisma.product.createMany({
    data: [
      { name: 'Asus ROG Strix', sku: 'ROG-001', price: 1500, stock: 10, categoryId: gamingLaptops.id },
      { name: 'MacBook Pro M3', sku: 'MAC-001', price: 2000, stock: 5, categoryId: laptops.id },
      { name: 'Sony Headphones', sku: 'SONY-001', price: 300, stock: 15, categoryId: electronics.id },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });