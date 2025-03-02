# MongoDB to MariaDB Migration Summary

This document summarizes the changes made to migrate the Orion PHP backend from MongoDB to MariaDB.

## Database Schema

We created a relational database schema with the following tables:

1. **users** - Stores user information
   - id (primary key)
   - username
   - email
   - password
   - score
   - streak
   - languages (JSON)
   - last_played
   - is_admin
   - password_reset_token
   - password_reset_expires
   - created_at
   - updated_at

2. **challenges** - Stores challenge questions and answers
   - id (primary key)
   - question
   - answer
   - type
   - difficulty
   - created_at

3. **daily_challenges** - Maps challenges to specific dates
   - id (primary key)
   - challenge_id (foreign key to challenges.id)
   - date
   - created_at

4. **user_played_challenges** - Tracks which challenges users have played
   - id (primary key)
   - user_id (foreign key to users.id)
   - challenge_id (foreign key to challenges.id)
   - correct
   - played_at

## Code Changes

### Database Connection

- Replaced MongoDB connection code with MariaDB connection code in `config/database.php`
- Added helper functions for executing SQL queries and fetching results

### Models

1. **User Model**
   - Updated to use SQL queries instead of MongoDB methods
   - Added functions to handle user played challenges
   - Modified data handling to work with relational tables

2. **Challenge Model**
   - Updated to use SQL queries instead of MongoDB methods
   - Modified daily challenge handling to use the daily_challenges table
   - Added function to get challenge by ID

3. **Leaderboard Model**
   - Updated to use SQL queries instead of MongoDB methods
   - Modified data handling to work with relational tables

### Scripts

1. **setup_database.php** and **setup_database.sql**
   - Created scripts to set up the MariaDB database schema

2. **update_env.php**
   - Created script to update environment variables for MariaDB

3. **migrate_data.php**
   - Created script to migrate data from MongoDB to MariaDB

4. **generateChallenges.php**
   - Updated to use SQL queries instead of MongoDB methods

## Environment Variables

Updated environment variables to use MariaDB credentials:

```
# Database Configuration
DB_HOST=93.127.192.101
DB_USER=kumo6500@localhost
DB_PASS=orion
DB_NAME=kumo6500_orion
```

## Documentation

1. **README.md**
   - Updated to reflect MariaDB usage
   - Added information about migration scripts

2. **MIGRATION-GUIDE.md**
   - Created guide for migrating from MongoDB to MariaDB

3. **CPANEL-SETUP-GUIDE.md**
   - Created guide for setting up the backend on cPanel with MariaDB

## Key Differences in Implementation

### Data Storage

- **MongoDB**: Stored data as documents with flexible schema
- **MariaDB**: Stores data in tables with fixed schema and relationships

### Relationships

- **MongoDB**: Used embedded documents or arrays of IDs
- **MariaDB**: Uses foreign keys and join queries

### JSON Data

- **MongoDB**: Native support for JSON-like documents
- **MariaDB**: Uses JSON columns for storing arrays and objects

### Queries

- **MongoDB**: Used find(), findOne(), updateOne(), etc.
- **MariaDB**: Uses SQL queries with prepared statements

## Benefits of Migration

1. **Better cPanel Integration**: MariaDB is natively supported in cPanel
2. **Familiar SQL Syntax**: Easier for developers familiar with SQL
3. **Structured Data**: Enforces data integrity with relationships
4. **Mature Ecosystem**: More tools and resources available for MySQL/MariaDB

## Challenges Addressed

1. **Schema Design**: Converted flexible MongoDB schema to structured tables
2. **Data Migration**: Created script to migrate existing data
3. **Query Conversion**: Converted MongoDB queries to SQL
4. **Relationship Handling**: Implemented proper foreign key relationships 