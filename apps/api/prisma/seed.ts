import { PrismaClient, Role, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Inc',
      domain: 'acme.finvofy.local',
      settings: {
        invoicePrefix: 'INV',
        taxRate: 10,
        currency: 'USD',
      },
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create owner user
  const hashedPassword = await bcrypt.hash('password123', 12);
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@acme.com',
      name: 'John Owner',
      passwordHash: hashedPassword,
      role: Role.OWNER,
      isActive: true,
    },
  });

  console.log('✅ Created owner user:', owner.email);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@acme.com',
      name: 'Jane Admin',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create demo customers
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1-555-0100',
      address: '123 Main St, New York, NY 10001',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1-555-0200',
      address: '456 Oak Ave, Los Angeles, CA 90001',
    },
  });

  console.log('✅ Created 2 demo customers');

  // Create demo draft invoice
  const draftInvoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customer1.id,
      number: 'INV-001',
      status: InvoiceStatus.DRAFT,
      currency: 'USD',
      items: [
        {
          description: 'Web Design Services',
          quantity: 10,
          unitPrice: 150,
          taxRate: 10,
          total: 1650,
        },
        {
          description: 'Logo Design',
          quantity: 1,
          unitPrice: 500,
          taxRate: 10,
          total: 550,
        },
      ],
      subtotal: 2000,
      tax: 200,
      total: 2200,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // Create demo sent invoice
  const sentInvoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customer2.id,
      number: 'INV-002',
      status: InvoiceStatus.SENT,
      currency: 'USD',
      items: [
        {
          description: 'Consulting Services',
          quantity: 20,
          unitPrice: 200,
          taxRate: 10,
          total: 4400,
        },
      ],
      subtotal: 4000,
      tax: 400,
      total: 4400,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      issuedAt: new Date(),
    },
  });

  console.log('✅ Created 2 demo invoices');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Owner: owner@acme.com / password123');
  console.log('   Admin: admin@acme.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
