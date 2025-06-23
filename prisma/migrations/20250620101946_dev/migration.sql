/*
  Warnings:

  - Added the required column `amount` to the `user_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_items" ADD COLUMN     "amount" INTEGER NOT NULL;
