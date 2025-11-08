ALTER TABLE posts
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

UPDATE posts
SET slug = CONCAT_WS(
    '-'
  , NULLIF(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), '')
  , substring(id::text, 1, 8)
)
WHERE slug IS NULL;

ALTER TABLE posts
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
