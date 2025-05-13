import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "simugomwaobald250@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "superadmin123" ;

  if (!email || !password) {
    throw new Error('Environment variables SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be defined');
  }
  const roles = await Promise.all([
    prisma.roles.upsert({
      where: { name: 'super-admin' },
      update: {},
      create: { name: 'super-admin' },
    }),
    prisma.roles.upsert({
      where: { name: 'ticketmanager' },
      update: {},
      create: { name: 'ticketmanager' }, 
    }),
    prisma.roles.upsert({
      where: { name: 'developer' },
      update: {},
      create: { name: 'developer' },
    }),
    prisma.roles.upsert({
      where: { name: 'client' },
      update: {},
      create: { name: 'client' },
    }),
  ]);
  
  let superAdmin = await prisma.users.findUnique({
    where: { email: email }, 
  });

  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10); // Use password from .env
    superAdmin = await prisma.users.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: email, // Use email from .env
        password: hashedPassword,
      },
    });
  }  

 
  const userRole = await prisma.userRoles.findFirst({
    where: {
      userId: superAdmin.id,
      roleId: roles[0].id,
    },
  });

  if (!userRole) {
    await prisma.userRoles.create({
      data: {
        userId: superAdmin.id,
        roleId: roles[0].id, 
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


