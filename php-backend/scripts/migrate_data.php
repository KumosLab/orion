<?php
/**
 * Data Migration Script
 * Migrates data from MongoDB to MariaDB
 */

require_once __DIR__ . '/../config/dotenv.php';
require_once __DIR__ . '/../config/database.php';

// Load environment variables
loadEnv(__DIR__ . '/../../.env');

// Check if MongoDB extension is available
if (!extension_loaded('mongodb')) {
    die("MongoDB extension is not loaded. Please install it to migrate data.\n");
}

// MongoDB connection
function getMongoDBConnection() {
    $uri = getenv('MONGODB_URI');
    
    if (!$uri) {
        die("MongoDB URI not found in environment variables\n");
    }
    
    try {
        $client = new MongoDB\Client($uri);
        return $client;
    } catch (Exception $e) {
        die("MongoDB Connection Error: " . $e->getMessage() . "\n");
    }
}

// Get MongoDB database
function getMongoDB() {
    $client = getMongoDBConnection();
    return $client->selectDatabase('orion');
}

// Migrate users
function migrateUsers() {
    echo "Migrating users...\n";
    
    $mongodb = getMongoDB();
    $users = $mongodb->users->find();
    
    $count = 0;
    foreach ($users as $user) {
        // Convert MongoDB document to array
        $userData = iterator_to_array($user);
        
        // Convert MongoDB ObjectId to string
        $mongoId = (string)$userData['_id'];
        
        // Convert languages array to JSON
        $languages = isset($userData['languages']) ? json_encode($userData['languages']) : '[]';
        
        // Convert last_played timestamp
        $lastPlayed = null;
        if (isset($userData['last_played'])) {
            $lastPlayed = $userData['last_played']->toDateTime()->format('Y-m-d H:i:s');
        }
        
        // Convert password reset expires timestamp
        $passwordResetExpires = null;
        if (isset($userData['passwordResetExpires'])) {
            $passwordResetExpires = $userData['passwordResetExpires']->toDateTime()->format('Y-m-d H:i:s');
        }
        
        // Check if user already exists
        $query = "SELECT id FROM users WHERE email = ?";
        $result = executeQuery($query, [$userData['email']]);
        $existingUser = fetchRow($result);
        
        if ($existingUser) {
            echo "User with email {$userData['email']} already exists, skipping...\n";
            continue;
        }
        
        // Insert user into MariaDB
        $query = "INSERT INTO users (username, email, password, score, streak, languages, last_played, 
                  is_admin, password_reset_token, password_reset_expires) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $params = [
            $userData['username'],
            $userData['email'],
            $userData['password'],
            $userData['score'] ?? 0,
            $userData['streak'] ?? 0,
            $languages,
            $lastPlayed,
            isset($userData['isAdmin']) ? ($userData['isAdmin'] ? 1 : 0) : 0,
            $userData['passwordResetToken'] ?? null,
            $passwordResetExpires
        ];
        
        $userId = executeInsert($query, $params);
        
        if ($userId) {
            echo "Migrated user: {$userData['username']} (MongoDB ID: $mongoId, MariaDB ID: $userId)\n";
            
            // Store mapping of MongoDB ID to MariaDB ID
            $GLOBALS['user_id_map'][$mongoId] = $userId;
            
            // Migrate played challenges
            if (isset($userData['played_challenges']) && is_array($userData['played_challenges'])) {
                foreach ($userData['played_challenges'] as $challengeId) {
                    $GLOBALS['user_played_challenges'][] = [
                        'mongo_user_id' => $mongoId,
                        'mongo_challenge_id' => (string)$challengeId,
                        'mariadb_user_id' => $userId
                    ];
                }
            }
            
            $count++;
        } else {
            echo "Failed to migrate user: {$userData['username']}\n";
        }
    }
    
    echo "Migrated $count users\n";
}

// Migrate challenges
function migrateChallenges() {
    echo "Migrating challenges...\n";
    
    $mongodb = getMongoDB();
    $challenges = $mongodb->challenges->find();
    
    $count = 0;
    foreach ($challenges as $challenge) {
        // Convert MongoDB document to array
        $challengeData = iterator_to_array($challenge);
        
        // Convert MongoDB ObjectId to string
        $mongoId = (string)$challengeData['_id'];
        
        // Check if challenge already exists (by question)
        $query = "SELECT id FROM challenges WHERE question = ?";
        $result = executeQuery($query, [$challengeData['question']]);
        $existingChallenge = fetchRow($result);
        
        if ($existingChallenge) {
            echo "Challenge with question '{$challengeData['question']}' already exists, skipping...\n";
            $GLOBALS['challenge_id_map'][$mongoId] = $existingChallenge['id'];
            continue;
        }
        
        // Insert challenge into MariaDB
        $query = "INSERT INTO challenges (question, answer, type, difficulty) 
                 VALUES (?, ?, ?, ?)";
        
        $params = [
            $challengeData['question'],
            $challengeData['answer'],
            $challengeData['type'] ?? 'code',
            $challengeData['difficulty'] ?? 'medium'
        ];
        
        $challengeId = executeInsert($query, $params);
        
        if ($challengeId) {
            echo "Migrated challenge: {$challengeData['question']} (MongoDB ID: $mongoId, MariaDB ID: $challengeId)\n";
            
            // Store mapping of MongoDB ID to MariaDB ID
            $GLOBALS['challenge_id_map'][$mongoId] = $challengeId;
            
            // If it's a daily challenge, add it to daily_challenges
            if (isset($challengeData['date'])) {
                $date = $challengeData['date']->toDateTime()->format('Y-m-d');
                
                $query = "INSERT INTO daily_challenges (challenge_id, date) VALUES (?, ?)";
                executeInsert($query, [$challengeId, $date]);
                
                echo "Added daily challenge for date: $date\n";
            }
            
            $count++;
        } else {
            echo "Failed to migrate challenge: {$challengeData['question']}\n";
        }
    }
    
    echo "Migrated $count challenges\n";
}

// Migrate user played challenges
function migrateUserPlayedChallenges() {
    echo "Migrating user played challenges...\n";
    
    $count = 0;
    foreach ($GLOBALS['user_played_challenges'] as $playedChallenge) {
        $mongoUserId = $playedChallenge['mongo_user_id'];
        $mongoChallengeId = $playedChallenge['mongo_challenge_id'];
        
        // Get MariaDB user ID
        $userId = $GLOBALS['user_id_map'][$mongoUserId] ?? null;
        
        // Get MariaDB challenge ID
        $challengeId = $GLOBALS['challenge_id_map'][$mongoChallengeId] ?? null;
        
        if (!$userId || !$challengeId) {
            echo "Could not find MariaDB IDs for user $mongoUserId and challenge $mongoChallengeId, skipping...\n";
            continue;
        }
        
        // Insert user played challenge into MariaDB
        $query = "INSERT INTO user_played_challenges (user_id, challenge_id) 
                 VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE played_at = CURRENT_TIMESTAMP";
        
        $result = executeInsert($query, [$userId, $challengeId]);
        
        if ($result !== false) {
            echo "Migrated user played challenge: User $userId, Challenge $challengeId\n";
            $count++;
        } else {
            echo "Failed to migrate user played challenge: User $userId, Challenge $challengeId\n";
        }
    }
    
    echo "Migrated $count user played challenges\n";
}

// Initialize global variables
$GLOBALS['user_id_map'] = [];
$GLOBALS['challenge_id_map'] = [];
$GLOBALS['user_played_challenges'] = [];

// Run migration
echo "Starting migration from MongoDB to MariaDB...\n";

try {
    // Migrate users first
    migrateUsers();
    
    // Then migrate challenges
    migrateChallenges();
    
    // Finally migrate user played challenges
    migrateUserPlayedChallenges();
    
    echo "Migration completed successfully\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
} 