-- Allow the 'notes' category, and retire 'music'.
--
-- `posts.category` is guarded by a CHECK constraint, so adding a category in
-- application code is not enough — an insert with an unlisted value fails at
-- the database with a CheckViolation. Notes are mirrored in from the w_notes
-- app and every one of them lands in this category.
--
-- 'music' is dropped in the same statement because the notes category replaces
-- it: its page and nav entries are gone, and the category holds zero posts, so
-- nothing can be orphaned by removing it. Leaving it listed would let the admin
-- UI create posts in a category with no page to display them.
--
-- Re-runnable: the DROP is IF EXISTS, and the ADD replaces whatever was there.

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE posts
    ADD CONSTRAINT posts_category_check
        CHECK (category IN ('art', 'photo', 'projects', 'bio', 'apparel', 'notes'));
