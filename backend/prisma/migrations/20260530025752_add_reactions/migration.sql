-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "reactionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vibeScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_songId_voterId_key" ON "Reaction"("songId", "voterId");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
