import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import { UserRoleEnum } from "../src/types/enums";
dotenv.config();
const prisma = new PrismaClient();
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "simugomwaobald250@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";
  if (!email || !password) {
    throw new Error(
      "Environment variables SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be defined"
    );
  }
  const roleNames = [
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.TICKET_MANAGER,
    UserRoleEnum.DEVELOPER,
    UserRoleEnum.CLIENT,
  ];

  const roles = await Promise.all(
    roleNames.map((roleName) =>
      prisma.roles.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
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
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
