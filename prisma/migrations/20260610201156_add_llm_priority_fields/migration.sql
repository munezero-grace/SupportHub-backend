-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "agingScore" DOUBLE PRECISION,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "llmReasoning" TEXT;
