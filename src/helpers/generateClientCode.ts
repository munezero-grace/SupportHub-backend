import { PrismaClient } from "@prisma/client";

export async function generateClientCode(prisma: PrismaClient | any): Promise<string> {
    const baseClientCode = 'C-';

    const existingClientsCount = await prisma.clients.count();
    const newNumber = (1000 + existingClientsCount + 1).toString();
    return `${baseClientCode}${newNumber}`;
}
