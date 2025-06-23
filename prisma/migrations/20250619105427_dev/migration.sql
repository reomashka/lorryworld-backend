/*
  Warnings:

  - The values [Ножи,Сеты,Пистолеты,Петы] on the enum `ItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemType_new" AS ENUM ('KNIFE', 'SET', 'PISTOL', 'PET');
ALTER TABLE "items" ALTER COLUMN "type" TYPE "ItemType_new" USING ("type"::text::"ItemType_new");
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
ALTER TYPE "ItemType_new" RENAME TO "ItemType";
DROP TYPE "ItemType_old";
COMMIT;
