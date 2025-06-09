/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Clients" ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT,
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'inactive';

-- CreateIndex
CREATE UNIQUE INDEX "Clients_email_key" ON "Clients"("email");
