import { PrismaClient } from '@prisma/client';
import { subMonths, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.activity.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.client.deleteMany();

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Acme Corp',
        email: 'contact@acme.com',
        phone: '(555) 123-4567',
        company: 'Acme Corporation',
        status: 'active'
      }
    }),
    prisma.client.create({
      data: {
        name: 'Globex Inc',
        email: 'info@globex.com',
        phone: '(555) 987-6543',
        company: 'Globex Industries',
        status: 'active'
      }
    }),
    prisma.client.create({
      data: {
        name: 'Wayne Enterprises',
        email: 'business@wayne.com',
        phone: '(555) 456-7890',
        company: 'Wayne Enterprises',
        status: 'active'
      }
    })
  ]);

  // Create quotes for the last 12 months
  const statuses = ['quote', 'quoted', 'purchase', 'purchased', 'received', 'paid'];
  const products = ['Website Development', 'Mobile App', 'Cloud Services', 'SEO Package', 'Security Audit'];
  const platforms = ['Direct', 'AWS', 'GitHub', 'Google', 'Figma'];

  for (let i = 0; i < 150; i++) {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    const randomDate = subDays(new Date(), Math.floor(Math.random() * 365));
    const cost = Math.floor(Math.random() * 10000) + 1000;
    const chargedAmount = cost * 1.3;

    const quote = await prisma.quote.create({
      data: {
        clientId: randomClient.id,
        product: randomProduct,
        platform: randomPlatform,
        status: randomStatus,
        cost,
        chargedAmount,
        notes: `Sample ${randomProduct} project`,
        createdAt: randomDate,
        updatedAt: randomDate
      }
    });

    // Create activity for the quote
    await prisma.activity.create({
      data: {
        quoteId: quote.id,
        type: randomStatus === 'paid' ? 'Payment Received' : 'New Quote',
        amount: chargedAmount,
        status: randomStatus === 'paid' ? 'completed' : 'pending',
        createdAt: randomDate
      }
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 