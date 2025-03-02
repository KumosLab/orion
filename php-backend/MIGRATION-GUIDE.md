# Migration Guide: MongoDB to MariaDB

This guide explains how to migrate the Orion PHP backend from MongoDB to MariaDB.

## Prerequisites

1. Access to a MariaDB/MySQL server
2. phpMyAdmin or another MySQL client tool
3. PHP with mysqli extension enabled

## Migration Steps

### 1. Update Environment Variables

First, update your `.env` file with MariaDB credentials:

```
# Database Configuration
DB_HOST=93.127.192.101
DB_USER=kumo6500@localhost
DB_PASS=orion
DB_NAME=kumo6500_orion
```

You can use the provided script to update your `.env` file automatically:

```bash
php php-backend/scripts/update_env.php
```

### 2. Create Database Schema

Run the database setup script to create the necessary tables:

```bash
php php-backend/scripts/setup_database.php
```

This will create the following tables:
- `users` - Stores user information
- `challenges` - Stores challenge questions and answers
- `daily_challenges` - Maps challenges to specific dates
- `user_played_challenges` - Tracks which challenges users have played

### 3. Import Data from MongoDB (Optional)

If you have existing data in MongoDB that you want to migrate to MariaDB, you'll need to:

1. Export data from MongoDB
2. Transform the data to fit the MariaDB schema
3. Import the data into MariaDB

A sample data migration script is provided in `php-backend/scripts/migrate_data.php`.

### 4. Update Code to Use MariaDB

The codebase has been updated to use MariaDB instead of MongoDB. The main changes are:

- `database.php` now connects to MariaDB instead of MongoDB
- Models have been updated to use SQL queries instead of MongoDB methods
- Data structures have been adjusted to work with relational tables

### 5. Test the Application

After migrating to MariaDB, thoroughly test the application to ensure everything works correctly:

1. Test user registration and login
2. Test challenge retrieval and submission
3. Test leaderboard functionality
4. Test user profile updates

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify your MariaDB credentials in the `.env` file
2. Check if the MariaDB server is accessible from your PHP server
3. Ensure the mysqli extension is enabled in PHP

### Data Migration Issues

If you encounter issues during data migration:

1. Check the MongoDB export format
2. Verify the data transformation logic
3. Check for any unique constraint violations in MariaDB

### Query Errors

If you encounter SQL query errors:

1. Check the error logs for specific error messages
2. Verify the SQL syntax in the affected model
3. Test the query directly in phpMyAdmin

## Differences Between MongoDB and MariaDB

### Data Structure

- MongoDB: Document-based, flexible schema
- MariaDB: Table-based, rigid schema with relationships

### Queries

- MongoDB: JSON-like query language
- MariaDB: SQL query language

### Relationships

- MongoDB: Embedded documents or references
- MariaDB: Foreign keys and joins

### Performance Considerations

- MongoDB: Better for unstructured data and high write loads
- MariaDB: Better for structured data and complex queries

## Support

If you encounter any issues during migration, please contact the development team for assistance. 