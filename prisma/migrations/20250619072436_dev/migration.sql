/*
  Warnings:

  - You are about to drop the column `expires_in` on the `payments` table. All the data in the column will be lost.
  - Added the required column `created_at` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" DROP COLUMN "expires_in",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL;
