import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: hash, role: 'admin' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@echora.com' },
    update: { passwordHash: hash, role: 'admin', isActive: true },
    create: { email: 'admin@echora.com', passwordHash: hash, role: 'admin' },
  });

  const staffHash = await bcrypt.hash('staff123', 10);
  await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: { email: 'staff@demo.com', passwordHash: staffHash, role: 'staff' },
  });

  const customerHash = await bcrypt.hash('customer123', 10);
  const customers = [
    { email: 'alice@example.com', displayName: 'Alice Wong', phoneNumber: '+6591234567' },
    { email: 'bob@example.com', displayName: 'Bob Tan', phoneNumber: '+6598765432' },
    { email: 'carol@example.com', displayName: 'Carol Lee', phoneNumber: '+6587654321' },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { email: c.email },
      update: {},
      create: { ...c, passwordHash: customerHash },
    });
  }

  const merchants = [
    { email: 'sunrise@example.com', displayName: 'Sunrise Bakery', description: 'Artisan breads and pastries', phoneNumber: '+6561234567', address: '123 Baker St' },
    { email: 'greenleaf@example.com', displayName: 'Green Leaf Cafe', description: 'Organic salads and smoothies', phoneNumber: '+6568765432', address: '456 Garden Ave', status: 'active' },
  ];
  for (const m of merchants) {
    await prisma.merchant.upsert({
      where: { email: m.email },
      update: {},
      create: m,
    });
  }

  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1))`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"customers"', 'id'), COALESCE((SELECT MAX(id) FROM "customers"), 1))`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"merchants"', 'id'), COALESCE((SELECT MAX(id) FROM "merchants"), 1))`;

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
