-- AlterTable
ALTER TABLE "products" ALTER COLUMN "sequence" SET DEFAULT 1001,
ALTER COLUMN "sequence" DROP DEFAULT;
DROP SEQUENCE "products_sequence_seq";
