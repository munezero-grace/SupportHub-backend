import { PrismaClient } from "@prisma/client";
import { softDeleteMiddleware } from "./prismaMiddleware";

const prisma = new PrismaClient();

prisma.$use(softDeleteMiddleware);

export default prisma;
