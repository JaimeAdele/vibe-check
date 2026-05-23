/*
  Warnings:

  - Added the required column `startTime` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add as nullable first, backfill existing rows, then enforce NOT NULL
ALTER TABLE "Event" ADD COLUMN "startTime" TIMESTAMP(3);
UPDATE "Event" SET "startTime" = "createdAt" WHERE "startTime" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "startTime" SET NOT NULL;
