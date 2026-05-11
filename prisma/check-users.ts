import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany({
    select: { email: true, firstName: true, lastName: true, id: true },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const clients = await prisma.clients.findMany({
    select: { clientCode: true, companyName: true, userId: true },
  });
  console.log("CLIENTS:", JSON.stringify(clients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
