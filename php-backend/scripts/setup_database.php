<?php
/**
 * Database Setup Script
 * Imports the SQL schema into MariaDB
 */

require_once __DIR__ . '/../config/dotenv.php';

// Load environment variables
loadEnv(__DIR__ . '/../../.env');

// Get database credentials from environment variables
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_user = getenv('DB_USER');
$db_pass = getenv('DB_PASS');
$db_name = getenv('DB_NAME') ?: 'orion';

if (!$db_user || !$db_pass) {
    die("Database credentials not found in environment variables\n");
}

// Connect to MySQL server (without selecting a database)
$conn = new mysqli($db_host, $db_user, $db_pass);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error . "\n");
}

echo "Connected to MySQL server successfully\n";

// Create database if it doesn't exist
$sql = "CREATE DATABASE IF NOT EXISTS $db_name";
if ($conn->query($sql) === TRUE) {
    echo "Database created successfully or already exists\n";
} else {
    die("Error creating database: " . $conn->error . "\n");
}

// Select the database
$conn->select_db($db_name);

// Read the SQL file
$sql_file = file_get_contents(__DIR__ . '/setup_database.sql');

// Split SQL file into individual statements
$statements = explode(';', $sql_file);

// Execute each statement
foreach ($statements as $statement) {
    $statement = trim($statement);
    if (!empty($statement)) {
        if ($conn->query($statement) === TRUE) {
            echo "Statement executed successfully\n";
        } else {
            echo "Error executing statement: " . $conn->error . "\n";
            echo "Statement: " . $statement . "\n";
        }
    }
}

echo "Database setup completed\n";

// Close connection
$conn->close(); 