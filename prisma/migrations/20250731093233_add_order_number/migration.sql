-- AlterTable
ALTER TABLE "items" ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "game" SET DEFAULT 'MM',
ALTER COLUMN "rarity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_number" INTEGER;
