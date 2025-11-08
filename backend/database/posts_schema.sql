-- Posts Table Schema
-- Core content entity for the portfolio

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location/Organization
    category VARCHAR(50) NOT NULL CHECK (category IN ('art', 'photo', 'music', 'projects', 'bio')),
    album VARCHAR(100) NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Media (S3 links)
    content_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    
    -- Sorting/Display
    date TIMESTAMP NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_album ON posts(album);
CREATE INDEX idx_posts_date ON posts(date DESC);
CREATE INDEX idx_posts_category_album ON posts(category, album);
CREATE INDEX idx_posts_category_date ON posts(category, date DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on post updates
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

