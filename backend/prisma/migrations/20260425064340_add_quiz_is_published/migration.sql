-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- Existing quizzes (pre-feature) remain visible/complete as published
UPDATE "Quiz" SET "isPublished" = true;
