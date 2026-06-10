-- Rename enum value OPERATOR -> ORGANIZER
ALTER TYPE "UserRole" RENAME VALUE 'OPERATOR' TO 'ORGANIZER';

-- Rename column operatorId -> organizerId on Event table
ALTER TABLE "Event" RENAME COLUMN "operatorId" TO "organizerId";
