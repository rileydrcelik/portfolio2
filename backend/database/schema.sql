+ -- Database Schema for Portfolio/E-commerce Website

+ CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (for future social features)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table (music, artwork, projects, apparel)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums table (portraits, anime, pencil under art page)
CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, slug)
);

-- Content items table (individual pieces)
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT, -- MDX content
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    metadata JSONB,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, slug)
);

-- Products table (for apparel/shop)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Price in cents
    images TEXT[],
    category VARCHAR(100),
    sizes TEXT[],
    colors TEXT[],
    inventory INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    total INTEGER NOT NULL, -- Total in cents
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL, -- Price at time of order in cents
    size VARCHAR(50),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table (main content feed)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    album VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    splash_image_url TEXT,
    date TIMESTAMP NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    price NUMERIC(10,2),
    gallery_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_major BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE posts
    ADD CONSTRAINT posts_category_check
        CHECK (category IN ('art', 'photo', 'music', 'projects', 'bio', 'apparel'));

-- Indexes for better performance
CREATE INDEX idx_subjects_slug ON subjects(slug);
CREATE INDEX idx_subjects_active ON subjects(is_active);
CREATE INDEX idx_albums_subject_id ON albums(subject_id);
CREATE INDEX idx_albums_slug ON albums(slug);
CREATE INDEX idx_albums_active ON albums(is_active);
CREATE INDEX idx_content_items_album_id ON content_items(album_id);
CREATE INDEX idx_content_items_slug ON content_items(slug);
CREATE INDEX idx_content_items_active ON content_items(is_active);
CREATE INDEX idx_content_items_featured ON content_items(is_featured);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Insert default subjects
INSERT INTO subjects (name, slug, description, "order") VALUES
('Music', 'music', 'Musical compositions and audio content', 1),
('Artwork', 'artwork', 'Visual art and creative pieces', 2),
('Projects', 'projects', 'Development projects and technical work', 3),
('Apparel', 'apparel', 'Clothing and merchandise', 4)
ON CONFLICT (slug) DO NOTHING;





