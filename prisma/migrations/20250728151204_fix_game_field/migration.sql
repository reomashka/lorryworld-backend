/*
  Warnings:

  - The `type` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rarity` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "items"
  ALTER COLUMN "game" DROP DEFAULT,
  ALTER COLUMN "game" DROP NOT NULL;

ALTER TABLE "items"
  ALTER COLUMN "game" TYPE "Game" USING "game"::text::"Game";

ALTER TABLE "items"
  ALTER COLUMN "game" SET DEFAULT 'MM',
  ALTER COLUMN "game" SET NOT NULL;
