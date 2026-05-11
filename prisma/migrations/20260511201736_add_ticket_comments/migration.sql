-- CreateTable
CREATE TABLE "TicketComments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TicketComments" ADD CONSTRAINT "TicketComments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComments" ADD CONSTRAINT "TicketComments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
