/*
  Warnings:

  - The `type` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `game` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rarity` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- Create enum
CREATE TYPE "Game" AS ENUM ('MM', 'GAG');

-- Сохраняем значения при смене типа
ALTER TABLE "items"
  ALTER COLUMN "type" TYPE TEXT USING "type"::text,
  ALTER COLUMN "rarity" TYPE TEXT USING "rarity"::text,
  ALTER COLUMN "game" TYPE "Game" USING "game"::text::"Game";
