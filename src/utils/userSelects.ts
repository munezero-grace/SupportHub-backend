import { Prisma } from "@prisma/client";

export const userSelectFields = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
  provider: true,
  providerId: true,
  password: false,
  updatedAt: false,
  
} satisfies Prisma.UsersSelect;
