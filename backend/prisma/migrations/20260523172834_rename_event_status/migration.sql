/*
  Warnings:

  - The values [DRAFT,LIVE,PAUSED] on the enum `EventStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventStatus_new" AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');
ALTER TABLE "public"."Event" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "status" TYPE "EventStatus_new" USING (CASE "status"::text WHEN 'DRAFT' THEN 'UPCOMING' WHEN 'LIVE' THEN 'ACTIVE' WHEN 'PAUSED' THEN 'ACTIVE' ELSE "status"::text END::"EventStatus_new");
ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";
ALTER TYPE "EventStatus_new" RENAME TO "EventStatus";
DROP TYPE "public"."EventStatus_old";
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'UPCOMING';
COMMIT;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'UPCOMING';
