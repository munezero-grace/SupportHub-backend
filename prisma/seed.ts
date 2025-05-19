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
}
main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
