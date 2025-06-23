-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('Chroma', 'Ancients', 'Godly', 'Vintages', 'Corrupt');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('Ножи', 'Сеты', 'Пистолеты', 'Петы');

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "type" "ItemType" NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "game" TEXT NOT NULL DEFAULT 'MM',
    "rarity" "ItemRarity" NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);
