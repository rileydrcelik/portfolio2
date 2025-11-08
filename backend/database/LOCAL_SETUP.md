# Local PostgreSQL Setup (Windows)

## Step 1: Install PostgreSQL

### Option A: Download Installer (Recommended)
1. Go to https://www.postgresql.org/download/windows/
2. Download the installer from EnterpriseDB
3. Run installer:
   - Choose installation directory (default is fine)
   - **Important**: Remember the password you set for the `postgres` user
   - Port: 5432 (default)
   - Locale: Default

### Option B: Using Chocolatey (if you have it)
```powershell
choco install postgresql
```

## Step 2: Verify Installation

After installation, open a new PowerShell window and verify:
```powershell
psql --version
```

## Step 3: Create Database

```powershell
# Connect to PostgreSQL (will prompt for password)
psql -U postgres

# In psql prompt, create database:
CREATE DATABASE portfolio_db;

# Verify it was created:
\l

# Exit psql:
\q
```

## Step 4: Run Schema

From project root directory:
```powershell
psql -U postgres -d portfolio_db -f backend\database\posts_schema.sql
```

You'll be prompted for the postgres user password.

## Step 5: Verify Table Created

```powershell
psql -U postgres -d portfolio_db

# Check tables:
\dt

# View posts table structure:
\d posts

# Exit:
\q
```

## Troubleshooting

### "psql is not recognized"
- Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\16\bin` (version may vary)
- Or use full path: `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`

### Connection Issues
- Make sure PostgreSQL service is running: Check Services app, find "postgresql" service

### Password Issues
- Default user is `postgres`
- Password was set during installation
- If forgotten, you may need to reset it or reinstall

