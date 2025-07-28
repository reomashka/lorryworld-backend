/*
  Warnings:

  - The `game` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- Создаём новый enum
CREATE TYPE "Game" AS ENUM ('MM', 'GAG');

-- Меняем тип колонки game с преобразованием
ALTER TABLE "items" 
  ALTER COLUMN "game" TYPE "Game" USING "game"::text::Game;
