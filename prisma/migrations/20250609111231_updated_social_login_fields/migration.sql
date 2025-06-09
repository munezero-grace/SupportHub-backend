/*
  Warnings:

  - You are about to drop the column `email` on the `Clients` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Clients` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Clients` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Clients` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Clients` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Clients_email_key";

-- AlterTable
ALTER TABLE "Clients" DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "provider",
DROP COLUMN "providerId";
