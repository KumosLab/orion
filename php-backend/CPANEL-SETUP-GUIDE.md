# cPanel Setup Guide for Orion PHP Backend

This guide provides step-by-step instructions for setting up the Orion PHP backend with MariaDB on a cPanel hosting account.

## 1. Create a Database in cPanel

1. Log in to your cPanel account.
2. Scroll down to the "Databases" section and click on "MySQL Databases".
3. Create a new database:
   - Enter a name for your database (e.g., `kumo6500_orion`).
   - Click "Create Database".

## 2. Create a Database User

1. In the same "MySQL Databases" page, scroll down to the "MySQL Users" section.
2. Create a new user:
   - Enter a username (e.g., `kumo6500`).
   - Enter a strong password or use the password generator.
   - Click "Create User".

## 3. Add User to Database

1. Scroll down to the "Add User To Database" section.
2. Select the user you just created from the dropdown.
3. Select the database you just created from the dropdown.
4. Click "Add".
5. On the privileges page, select "ALL PRIVILEGES" and click "Make Changes".

## 4. Upload Files to Server

1. Download an FTP client like FileZilla or use the cPanel File Manager.
2. Connect to your server using your cPanel credentials.
3. Create the following directory structure:
   ```
   public_html/
   └── orion/
       └── api/
   ```
4. Upload the `php-backend` directory to your server outside of the `public_html` directory for security.
5. Upload the `index.php` and `.htaccess` files to the `public_html/orion/api/` directory.

## 5. Create .env File

1. Create a `.env` file in the root directory (same level as `public_html`).
2. Add the following content, replacing the values with your actual database credentials:
   ```
   # Server Configuration
   NODE_ENV=production
   PORT=3000
   
   # Database Configuration
   DB_HOST=localhost
   DB_USER=kumo6500
   DB_PASS=orion
   DB_NAME=kumo6500_orion
   
   # JWT Config
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=30d
   JWT_COOKIE_EXPIRES_IN=30
   
   # OpenAI API Key (if needed)
   OPENAI_API_KEY=your-openai-api-key
   ```
   
   > **Note**: For the `DB_HOST`, use `localhost` if the database is on the same server as your PHP files. If you're using an external database server, use its hostname or IP address.

## 6. Set Up Database Tables

1. Access your cPanel and go to "Terminal" or "SSH Access".
2. Navigate to your website's root directory:
   ```bash
   cd ~
   ```
3. Run the database setup script:
   ```bash
   php php-backend/scripts/setup_database.php
   ```
   
   If you don't have SSH access, you can use phpMyAdmin to import the SQL schema:
   1. Go to cPanel and click on "phpMyAdmin".
   2. Select your database from the left sidebar.
   3. Click on the "Import" tab.
   4. Upload the `php-backend/scripts/setup_database.sql` file and click "Go".

## 7. Set Up Cron Job for Daily Challenges

1. In cPanel, click on "Cron Jobs".
2. Add a new cron job:
   - Select "Once a day (0 0 * * *)" from the "Common Settings" dropdown.
   - In the "Command" field, enter:
     ```
     php /home/username/php-backend/scripts/generateChallenges.php
     ```
     Replace `username` with your actual cPanel username.
   - Click "Add New Cron Job".

## 8. Test the API

1. Open your web browser and navigate to:
   ```
   https://yourdomain.com/orion/api/auth/check
   ```
2. You should see a JSON response with a 401 status code, indicating that you're not logged in.

## 9. Troubleshooting

### PHP Version

Make sure your server is using PHP 7.4 or higher:

1. In cPanel, go to "MultiPHP Manager".
2. Find your domain and select PHP 7.4 or higher.
3. Click "Apply".

### File Permissions

Set the correct file permissions:

1. In cPanel File Manager, select the `php-backend` directory.
2. Click "Permissions" (or right-click and select "Change Permissions").
3. Set the permissions to 755 for directories and 644 for files.
4. Make sure the `.env` file is readable by the web server.

### Database Connection Issues

If you're having trouble connecting to the database:

1. Double-check your database credentials in the `.env` file.
2. Make sure the database user has the necessary privileges.
3. Check if the mysqli extension is enabled in PHP.

### Error Logs

Check the error logs for more information:

1. In cPanel, go to "Error Log".
2. Look for any PHP errors related to the Orion backend.

## 10. Security Considerations

1. Make sure the `php-backend` directory is outside of the `public_html` directory to prevent direct access to sensitive files.
2. Use a strong password for your database user.
3. Set a strong JWT secret in the `.env` file.
4. Consider using HTTPS for your API endpoints.

## 11. Next Steps

1. Set up your frontend application to connect to the API.
2. Test all API endpoints to ensure they're working correctly.
3. Monitor the error logs for any issues.

If you encounter any problems during setup, please refer to the troubleshooting section or contact the development team for assistance. 