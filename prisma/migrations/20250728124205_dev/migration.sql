
-- Create enum
CREATE TYPE "Game" AS ENUM ('MM', 'GAG');

-- Сохраняем значения при смене типа
ALTER TABLE "items"
  ALTER COLUMN "type" TYPE TEXT USING "type"::text,
  ALTER COLUMN "rarity" TYPE TEXT USING "rarity"::text,
  ALTER COLUMN "game" TYPE "Game" USING "game"::text::"Game";
