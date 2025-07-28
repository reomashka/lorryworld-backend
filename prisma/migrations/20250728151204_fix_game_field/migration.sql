/*
  Warnings:

  - The `type` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rarity` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "items"
  ALTER COLUMN "type" TYPE TEXT USING "type"::text,
  ALTER COLUMN "rarity" TYPE TEXT USING "rarity"::text,
  ALTER COLUMN "game" DROP NOT NULL,
  ALTER COLUMN "game" DROP DEFAULT;
