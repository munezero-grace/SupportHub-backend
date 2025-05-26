import { PrismaClient, UserRoleEnum } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { UserRole } from "../src/types";

dotenv.config();

const prisma = new PrismaClient();
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Superadmin123";
  if (!email || !password) {
    throw new Error(
      "Environment variables SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be defined"
    );
  }
  const roleNames = [
    UserRole.SUPER_ADMIN,
    UserRole.TICKET_MANAGER,
    UserRole.DEVELOPER,
    UserRole.CLIENT,
  ];

  const roles = await Promise.all(
    roleNames.map((roleName) =>
      prisma.roles.upsert({
        where: { name: roleName as UserRoleEnum },
        update: {},
        create: { name: roleName as UserRoleEnum },
      })
    )
  );
  let superAdmin = await prisma.users.findUnique({
    where: { email: email },
  });
  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);

    superAdmin = await prisma.users.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: email,
        password: hashedPassword,
        provider: "credentials",
        providerId: "seeded-superadmin",
      },
    });
  }
  const superAdminRole = roles.find((r) => r.name === "super_admin");
  if (superAdmin && superAdminRole) {
    const userRole = await prisma.userRoles.findFirst({
      where: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    });
    if (!userRole) {
      await prisma.userRoles.create({
        data: {
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        },
      });
    }
  }

  // Initialize some products
  const initialProducts = [
    {
      name: "BP Ticket",
      description: "Support ticket management platform with integrations",
      status: "Active",
      clientCount: 3,
      developerCount: 2,
      activeTickets: 8,
    },
    {
      name: "BP Analytics",
      description: "Data visualization and analytics platform",
      status: "Active",
      clientCount: 3,
      developerCount: 2,
      activeTickets: 3,
    },
    {
      name: "Customer Portal",
      description: "Client-facing portal for ticket submission",
      status: "Active",
      clientCount: 2,
      developerCount: 1,
      activeTickets: 5,
    },
  ];

  console.log("Seeding products...");
  for (const product of initialProducts) {
    const sequence = await prisma.product.count() + 1001;
    const productId = `P-${sequence}`;

    await prisma.product.upsert({
      where: { id: productId },
      update: product,
      create: {
        id: productId,
        sequence,
        ...product,
      },
    });
  }

  console.log("Seeding completed.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
