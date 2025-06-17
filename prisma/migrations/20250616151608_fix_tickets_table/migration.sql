-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('in_progress', 'new', 'assigned', 'awaiting_client', 'resolved');

-- CreateEnum
CREATE TYPE "PriorityEnum" AS ENUM ('medium', 'low', 'high', 'critical');

-- CreateTable
CREATE TABLE "Tickets" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "StatusEnum" NOT NULL DEFAULT 'in_progress',
    "priority" "PriorityEnum" NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "createdBy" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "productId" TEXT,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "UserTickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tickets_ticketCode_key" ON "Tickets"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserTickets_userId_ticketId_key" ON "UserTickets"("userId", "ticketId");

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTickets" ADD CONSTRAINT "UserTickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTickets" ADD CONSTRAINT "UserTickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
