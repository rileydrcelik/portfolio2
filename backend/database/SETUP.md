# Database Setup Guide

## Prerequisites
- PostgreSQL installed locally, OR
- Access to a remote PostgreSQL database

## Option 1: Local PostgreSQL

### Step 1: Create the Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE portfolio_db;

# Exit psql
\q
```

### Step 2: Run the Schema
```bash
# From project root
psql -U postgres -d portfolio_db -f backend/database/posts_schema.sql
```

Or from within psql:
```bash
psql -U postgres -d portfolio_db
\i backend/database/posts_schema.sql
```

## Option 2: Remote/Cloud PostgreSQL

### Services:
- **Supabase** (free tier, easy setup)
- **Neon** (serverless PostgreSQL)
- **Railway** (easy deployment)
- **AWS RDS** (production-ready)
- **ElephantSQL** (free tier available)

### Steps:
1. Create database on your chosen service
2. Get connection string (DATABASE_URL)
3. Run schema using their SQL editor or psql with connection string:
   ```bash
   psql "postgresql://user:password@host:port/database" -f backend/database/posts_schema.sql
   ```

## Verify Setup

```bash
# Connect to database
psql -U postgres -d portfolio_db

# Check if posts table exists
\dt posts

# View table structure
\d posts

# Exit
\q
```

## Environment Variables

Add to your `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/portfolio_db
```

