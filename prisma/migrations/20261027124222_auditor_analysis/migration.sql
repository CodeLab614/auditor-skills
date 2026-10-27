-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('dangerous', 'review', 'no_serious_findings');

-- CreateEnum
CREATE TYPE "FileReview" AS ENUM ('source', 'decompiled', 'unreviewable');

-- CreateEnum
CREATE TYPE "FileOrigin" AS ENUM ('skill', 'plugin', 'readme', 'remote');

-- AlterTable
ALTER TABLE "analysis_job" ADD COLUMN     "heartbeatAt" TIMESTAMP(3),
ADD COLUMN     "progressCurrent" INTEGER,
ADD COLUMN     "progressTotal" INTEGER,
ADD COLUMN     "step" TEXT;

-- AlterTable
ALTER TABLE "skill" ADD COLUMN     "displayOwner" TEXT,
ADD COLUMN     "displayRepo" TEXT;

-- AlterTable
ALTER TABLE "skill_version" ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "report" JSONB,
ADD COLUMN     "sourceFiles" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "verdict" "Verdict";

-- CreateTable
CREATE TABLE "version_file" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "origin" "FileOrigin" NOT NULL,
    "blobSha" TEXT,
    "contentSha256" TEXT NOT NULL,
    "remoteUrl" TEXT,
    "downloadedAt" TIMESTAMP(3),
    "kind" TEXT NOT NULL,
    "language" TEXT,
    "lineCount" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "review" "FileReview" NOT NULL,
    "flags" TEXT[],

    CONSTRAINT "version_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "declared" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT NOT NULL DEFAULT 'rules',
    "filePath" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "version_file_versionId_path_key" ON "version_file"("versionId", "path");

-- CreateIndex
CREATE INDEX "finding_versionId_severity_idx" ON "finding"("versionId", "severity");

-- AddForeignKey
ALTER TABLE "version_file" ADD CONSTRAINT "version_file_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding" ADD CONSTRAINT "finding_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
