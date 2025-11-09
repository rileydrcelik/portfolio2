ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}'::text[];

UPDATE posts
SET gallery_urls = COALESCE(gallery_urls, '{}'::text[]);

ALTER TABLE posts
    ALTER COLUMN gallery_urls SET DEFAULT '{}'::text[];

ALTER TABLE posts
    ALTER COLUMN gallery_urls SET NOT NULL;
