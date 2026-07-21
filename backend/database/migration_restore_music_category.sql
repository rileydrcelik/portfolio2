-- Restore 'music' as a subject and drop the short-lived 'notes' category.
--
-- Supersedes migration_add_notes_category.sql. Embedded notes are no longer a
-- subject of their own: a note is placed inside an existing subject and marked
-- by `post_type = 'note'`, so the category column carries the subject the note
-- was filed under (music, art, …) exactly like any other post. That makes a
-- 'notes' category meaningless, and it made 'music' disappear for no reason.
--
-- Safe to run after the earlier migration or instead of it: the DROP is
-- IF EXISTS and the ADD replaces whatever constraint is present.

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE posts
    ADD CONSTRAINT posts_category_check
        CHECK (category IN ('art', 'photo', 'music', 'projects', 'bio', 'apparel'));
