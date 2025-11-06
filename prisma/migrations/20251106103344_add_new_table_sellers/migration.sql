-- CreateTable
CREATE TABLE "sellers" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "game" TEXT NOT NULL DEFAULT 'MM',

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);
