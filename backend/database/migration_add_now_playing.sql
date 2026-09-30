-- What is playing in mariposa, the owner's music app, for the now-playing post.
--
-- The phone pushes snapshots to /api/presence/ingest; the site reads them from
-- /api/presence/now-playing. Nothing here is a post: a now-playing post is only
-- a marker (post_type = 'now_playing') that says where the live card goes.
--
-- `track_key` is an HMAC of the app's track id (a YouTube video id), never the
-- id itself, so nothing public ties the site to a particular upload.

-- The one current state. A single row, pinned by the CHECK.
CREATE TABLE IF NOT EXISTS now_playing (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- 'playing' | 'paused' | 'stopped' | 'hidden'
    state VARCHAR(16) NOT NULL,
    -- Ordering: a per-launch session id and a counter within it, so a retried
    -- snapshot that arrives late never overwrites a newer one.
    session VARCHAR(64) NOT NULL,
    counter BIGINT NOT NULL,
    -- When the phone saw this state, on the server's clock.
    observed_at TIMESTAMP NOT NULL,
    track_key VARCHAR(64),
    title VARCHAR(500),
    artists TEXT[] NOT NULL DEFAULT '{}',
    album VARCHAR(500),
    duration_s REAL,
    gradient TEXT[],
    position_s REAL NOT NULL DEFAULT 0,
    -- The moment `position_s` was true, on the server's clock.
    position_at TIMESTAMP NOT NULL,
    last_heartbeat_at TIMESTAMP NOT NULL,
    -- Bumped on every change a reader could see; the read's ETag.
    version BIGINT NOT NULL DEFAULT 0
);

-- Songs recently started, newest first; pruned to the last 20 on insert.
CREATE TABLE IF NOT EXISTS recent_plays (
    id BIGSERIAL PRIMARY KEY,
    track_key VARCHAR(64) NOT NULL,
    title VARCHAR(500) NOT NULL,
    artists TEXT[] NOT NULL DEFAULT '{}',
    album VARCHAR(500),
    gradient TEXT[],
    played_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recent_plays_played_at ON recent_plays (played_at DESC);

-- One cover per song, uploaded by the phone the first time it is needed and
-- again only when the phone's copy changes (`art_rev`).
CREATE TABLE IF NOT EXISTS presence_artwork (
    track_key VARCHAR(64) PRIMARY KEY,
    art_rev VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
