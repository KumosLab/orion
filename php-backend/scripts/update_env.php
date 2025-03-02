<?php
/**
 * Update Environment Variables Script
 * Updates the .env file with MariaDB credentials
 */

// Path to .env file
$envFile = __DIR__ . '/../../.env';

// Check if .env file exists
if (!file_exists($envFile)) {
    // Create a new .env file if it doesn't exist
    $envContent = <<<EOT
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
EOT;

    file_put_contents($envFile, $envContent);
    echo "Created new .env file with MariaDB credentials\n";
} else {
    // Read existing .env file
    $envContent = file_get_contents($envFile);
    
    // Check if it already has MariaDB credentials
    if (strpos($envContent, 'DB_HOST') !== false) {
        // Update existing credentials
        $envContent = preg_replace('/DB_HOST=.*/', 'DB_HOST=93.127.192.101', $envContent);
        $envContent = preg_replace('/DB_USER=.*/', 'DB_USER=kumo6500@localhost', $envContent);
        $envContent = preg_replace('/DB_PASS=.*/', 'DB_PASS=orion', $envContent);
        $envContent = preg_replace('/DB_NAME=.*/', 'DB_NAME=kumo6500_orion', $envContent);
    } else {
        // Add MariaDB credentials
        $dbConfig = <<<EOT

# Database Configuration
DB_HOST=93.127.192.101
DB_USER=kumo6500@localhost
DB_PASS=orion
DB_NAME=kumo6500_orion
EOT;
        
        // Insert after MongoDB URI or at the end if not found
        if (strpos($envContent, 'MONGODB_URI') !== false) {
            $envContent = str_replace('MONGODB_URI=', "MONGODB_URI=" . $dbConfig . "\n", $envContent);
        } else {
            $envContent .= $dbConfig;
        }
    }
    
    // Write updated content back to .env file
    file_put_contents($envFile, $envContent);
    echo "Updated .env file with MariaDB credentials\n";
}

echo "Environment variables updated successfully\n"; 