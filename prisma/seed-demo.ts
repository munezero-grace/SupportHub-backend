import { PrismaClient, UserRoleEnum } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

const DEMO_USERS = [
  { firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@supporthub.com", role: UserRoleEnum.super_admin },
  { firstName: "Marcus", lastName: "Williams", email: "marcus.williams@supporthub.com", role: UserRoleEnum.ticket_manager },
  { firstName: "James", lastName: "Chen", email: "james.chen@supporthub.com", role: UserRoleEnum.developer },
  { firstName: "Priya", lastName: "Patel", email: "priya.patel@supporthub.com", role: UserRoleEnum.developer },
  { firstName: "Liam", lastName: "Murphy", email: "liam.murphy@supporthub.com", role: UserRoleEnum.developer },
  { firstName: "Sofia", lastName: "Rodriguez", email: "sofia.rodriguez@supporthub.com", role: UserRoleEnum.developer },
  { firstName: "Kai", lastName: "Nakamura", email: "kai.nakamura@supporthub.com", role: UserRoleEnum.developer },
  { firstName: "Emma", lastName: "Thompson", email: "emma.thompson@techvision.com", role: UserRoleEnum.client },
  { firstName: "Oliver", lastName: "Bennett", email: "oliver.bennett@datasync.com", role: UserRoleEnum.client },
];

async function main() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

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

  const roleMap: Record<string, string> = Object.fromEntries(
    roles.map((r) => [r.name, r.id]),
  );

  for (const u of DEMO_USERS) {
    const existing = await prisma.users.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`skipped (already exists): ${u.email}`);
      continue;
    }

    const user = await prisma.users.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: hashedPassword,
        provider: "credentials",
        providerId: `demo-${u.email}`,
      },
    });

    await prisma.userRoles.create({
      data: { userId: user.id, roleId: roleMap[u.role] },
    });

    console.log(`created: ${u.email} (${u.role})`);
  }

  console.log("done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
