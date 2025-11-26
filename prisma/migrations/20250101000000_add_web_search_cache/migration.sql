-- CreateTable
CREATE TABLE IF NOT EXISTS "WebSearchCache" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebSearchCache_query_key" ON "WebSearchCache"("query");

