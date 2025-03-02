# Orion PHP Backend

This is a PHP backend for the Orion application. It provides API endpoints for authentication, game functionality, and user management. The backend uses MariaDB for data storage.

## Requirements

- PHP 7.4 or higher
- MariaDB/MySQL database
- cPanel hosting with PHP support

## Installation

1. Upload the `php-backend` directory to your server outside of the `public_html` directory for security.
2. Upload the `public_html/orion/api/index.php` and `public_html/orion/api/.htaccess` files to your server.
3. Create a `.env` file with the necessary environment variables (see below).
4. Run the database setup script to create the necessary tables:
   ```bash
   php php-backend/scripts/setup_database.php
   ```

## Directory Structure

```
php-backend/
├── config/
│   ├── database.php
│   └── dotenv.php
├── controllers/
│   ├── authController.php
│   ├── gameController.php
│   └── userController.php
├── middleware/
│   └── auth.php
├── models/
│   ├── Challenge.php
│   ├── Leaderboard.php
│   └── User.php
├── routes/
│   └── router.php
├── scripts/
│   ├── generateChallenges.php
│   ├── migrate_data.php
│   ├── setup_database.php
│   └── update_env.php
├── MIGRATION-GUIDE.md
└── README.md

public_html/
└── orion/
    └── api/
        ├── .htaccess
        └── index.php
```

## API Endpoints

The PHP backend provides the following API endpoints:

### Authentication

- `POST /api/auth/signup` - Sign up a new user
- `POST /api/auth/login` - Log in a user
- `GET /api/auth/logout` - Log out a user
- `GET /api/auth/check` - Check if a user is logged in
- `POST /api/auth/forgotPassword` - Send a password reset email
- `PATCH /api/auth/resetPassword/:token` - Reset a user's password
- `PATCH /api/auth/updatePassword` - Update a user's password

### Game

- `GET /api/game/challenge` - Get the daily challenge
- `GET /api/game/daily-status` - Check if a user has played today
- `POST /api/game/submit` - Submit an answer
- `GET /api/game/leaderboard` - Get the leaderboard
- `GET /api/game/user-stats` - Get user stats
- `POST /api/game/admin/reset-player/:playerId` - Reset a player's last play time (admin only)

### User

- `GET /api/users/me` - Get the current user's data
- `PATCH /api/users/update-languages` - Update a user's languages
- `PATCH /api/users/update-profile` - Update a user's profile
- `DELETE /api/users/delete-account` - Delete a user's account

## Generating Daily Challenges

To generate daily challenges, you can set up a cron job to run the `generateChallenges.php` script daily:

```bash
0 0 * * * php /path/to/php-backend/scripts/generateChallenges.php
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=93.127.192.101
DB_USER=kumo6500@localhost
DB_PASS=orion
DB_NAME=kumo6500_orion

# JWT Config
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=30

# OpenAI API Key (if needed)
OPENAI_API_KEY=your-openai-api-key
```

## Migration from MongoDB

If you're migrating from MongoDB to MariaDB, see the `MIGRATION-GUIDE.md` file for detailed instructions. You can use the provided scripts to:

1. Update your environment variables with MariaDB credentials:
   ```bash
   php php-backend/scripts/update_env.php
   ```

2. Set up the MariaDB database schema:
   ```bash
   php php-backend/scripts/setup_database.php
   ```

3. Migrate data from MongoDB to MariaDB (if needed):
   ```bash
   php php-backend/scripts/migrate_data.php
   ```

## Troubleshooting

### Database Connection Issues

If you're having trouble connecting to the database, check:

1. The database credentials in your `.env` file
2. That the database server is accessible from your PHP server
3. That the necessary database tables have been created

### API Endpoint Issues

If the API endpoints are not working, check:

1. The `.htaccess` file is correctly configured to route requests to the PHP backend
2. The `index.php` file is in the correct location
3. The PHP backend files are in the correct location
4. The `.env` file contains the necessary environment variables

## License

This project is licensed under the MIT License. 