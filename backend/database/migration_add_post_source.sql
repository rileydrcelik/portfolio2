-- Provenance for posts mirrored in from an external system.
--
-- `source` names the upstream system ('w_notes'); `source_id` is that system's
-- own id for the record (a note's uuid). Together they let the ingest endpoint
-- upsert idempotently: re-publishing an edited note must update the post it
-- already created, not accumulate a duplicate on every edit.
--
-- Both stay NULL for posts authored in the portfolio admin, which is why the
-- unique index is partial — NULLs are distinct in Postgres, so a plain unique
-- index would technically permit unlimited (NULL, NULL) rows, but a partial
-- index states the intent directly and stays small.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source
    ON posts (source, source_id)
    WHERE source IS NOT NULL;
