-- Migration: Remove _album suffix from album names
-- This updates all album names to remove the _album suffix

-- Update album names that end with _album
UPDATE posts 
SET album = REPLACE(album, '_album', '')
WHERE album LIKE '%_album';

-- Verify the changes
SELECT DISTINCT album, category 
FROM posts 
ORDER BY category, album;

