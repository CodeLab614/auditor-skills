-- Trigram search for the catalog
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "skill" ADD COLUMN     "latestAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "latestHasRemoteScripts" BOOLEAN,
ADD COLUMN     "latestVerdict" "Verdict",
ADD COLUMN     "latestVersionId" TEXT,
ADD COLUMN     "latestWarningCount" INTEGER,
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "skill_latestAnalyzedAt_idx" ON "skill"("latestAnalyzedAt");

-- CreateIndex
CREATE INDEX "skill_name_idx" ON "skill"("name");

-- CreateIndex
CREATE INDEX "skill_latestWarningCount_idx" ON "skill"("latestWarningCount");

-- CreateIndex
CREATE INDEX "skill_latestVerdict_idx" ON "skill"("latestVerdict");

-- CreateIndex
CREATE INDEX "skill_searchText_idx" ON "skill" USING GIN ("searchText" gin_trgm_ops);

-- Backfill the latest analysis of every skill
UPDATE "skill" s
SET ("latestVersionId", "latestVerdict", "latestAnalyzedAt", "latestHasRemoteScripts", "latestWarningCount") = (
  SELECT v."id", v."verdict", v."analyzedAt", v."hasRemoteScripts",
         (SELECT count(*) FROM "finding" f WHERE f."versionId" = v."id")::int
  FROM "skill_version" v
  WHERE v."skillId" = s."id" AND v."verdict" IS NOT NULL AND v."analyzedAt" IS NOT NULL
  ORDER BY v."analyzedAt" DESC, v."id" DESC
  LIMIT 1
);

-- Backfill the search text (same result as lib/auditor/search-text.ts)
UPDATE "skill" SET "searchText" = trim(regexp_replace(lower(translate(
  "name" || ' ' || "description" || ' ' || coalesce("displayOwner", "owner") || '/' || coalesce("displayRepo", "repo"),
  'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ', 'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC')), '\s+', ' ', 'g'));
