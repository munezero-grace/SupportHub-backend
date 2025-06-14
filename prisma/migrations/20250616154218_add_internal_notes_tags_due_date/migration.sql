-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
