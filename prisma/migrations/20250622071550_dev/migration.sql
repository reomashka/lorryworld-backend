-- CreateEnum
CREATE TYPE "MediaContactType" AS ENUM ('TELEGRAM', 'VK', 'EMAIL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contact" TEXT,
ADD COLUMN     "media_contact" "MediaContactType";
