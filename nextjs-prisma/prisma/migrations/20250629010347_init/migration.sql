-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'RATED', 'ERROR', 'DELETED');

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "rating" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
