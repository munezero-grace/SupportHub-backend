import { PrismaClient, UserRoleEnum } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Superadmin123...";

  if (!email || !password) {
    throw new Error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD");
  }

  const roleNames: UserRoleEnum[] = [
    UserRoleEnum.super_admin,
    UserRoleEnum.ticket_manager,
    UserRoleEnum.developer,
    UserRoleEnum.client,
  ];

  const roles = await Promise.all(
    roleNames.map((name) =>
      prisma.roles.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // ✅ Explicit type on `r` to satisfy strict ts-node
  const superAdminRole = roles.find(
    (r: { id: string; name: UserRoleEnum }) =>
      r.name === UserRoleEnum.super_admin,
  );

  if (!superAdminRole) {
    throw new Error("super_admin role missing after seeding");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.users.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      provider: "credentials",
    },
    create: {
      firstName: "Super",
      lastName: "Admin",
      email,
      password: hashedPassword,
      provider: "credentials",
      providerId: "seeded-superadmin",
    },
  });

  const existingRole = await prisma.userRoles.findFirst({
    where: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  if (!existingRole) {
    await prisma.userRoles.create({
      data: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    });
  }

  console.log("✅ Super admin ensured successfully:", email);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
