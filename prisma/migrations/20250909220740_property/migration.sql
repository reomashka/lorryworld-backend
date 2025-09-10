/*
  Warnings:

  - You are about to drop the column `properties` on the `items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "items" DROP COLUMN "properties",
ADD COLUMN     "property" TEXT;
