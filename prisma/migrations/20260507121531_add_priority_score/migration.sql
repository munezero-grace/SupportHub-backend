-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "lastScoredAt" TIMESTAMP(3),
ADD COLUMN     "priorityScore" DOUBLE PRECISION DEFAULT 0;
