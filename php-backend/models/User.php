<?php
/**
 * User Model
 * Handles user-related database operations
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Find a user by ID
 * 
 * @param int $id The user ID
 * @return array|null The user data or null if not found
 */
function findUserById($id) {
    try {
        $query = "SELECT id, username, email, score, streak, languages, last_played, is_admin, created_at, updated_at 
                 FROM users WHERE id = ?";
        $result = executeQuery($query, [$id]);
        
        if (!$result) {
            return null;
        }
        
        $user = fetchRow($result);
        
        if (!$user) {
            return null;
        }
        
        // Convert JSON string to array
        if (isset($user['languages'])) {
            $user['languages'] = jsonToArray($user['languages']);
        } else {
            $user['languages'] = [];
        }
        
        return $user;
    } catch (Exception $e) {
        error_log('Error finding user by ID: ' . $e->getMessage());
        return null;
    }
}

/**
 * Find a user by email
 * 
 * @param string $email The user email
 * @return array|null The user data or null if not found
 */
function findUserByEmail($email) {
    try {
        $query = "SELECT * FROM users WHERE email = ?";
        $result = executeQuery($query, [$email]);
        
        if (!$result) {
            return null;
        }
        
        $user = fetchRow($result);
        
        if (!$user) {
            return null;
        }
        
        // Convert JSON string to array
        if (isset($user['languages'])) {
            $user['languages'] = jsonToArray($user['languages']);
        } else {
            $user['languages'] = [];
        }
        
        return $user;
    } catch (Exception $e) {
        error_log('Error finding user by email: ' . $e->getMessage());
        return null;
    }
}

/**
 * Create a new user
 * 
 * @param array $userData The user data
 * @return array|null The created user data or null if failed
 */
function createUser($userData) {
    try {
        // Hash password
        $userData['password'] = password_hash($userData['password'], PASSWORD_BCRYPT);
        
        // Convert languages array to JSON
        $languages = isset($userData['languages']) ? arrayToJson($userData['languages']) : '[]';
        
        $query = "INSERT INTO users (username, email, password, score, streak, languages) 
                 VALUES (?, ?, ?, ?, ?, ?)";
        
        $params = [
            $userData['username'],
            $userData['email'],
            $userData['password'],
            $userData['score'] ?? 0,
            $userData['streak'] ?? 0,
            $languages
        ];
        
        $userId = executeInsert($query, $params);
        
        if (!$userId) {
            return null;
        }
        
        // Get the inserted user
        return findUserById($userId);
    } catch (Exception $e) {
        error_log('Error creating user: ' . $e->getMessage());
        return null;
    }
}

/**
 * Update a user
 * 
 * @param int $id The user ID
 * @param array $updateData The data to update
 * @return bool True if updated, false otherwise
 */
function updateUser($id, $updateData) {
    try {
        $setClause = [];
        $params = [];
        
        // Build SET clause and parameters
        foreach ($updateData as $key => $value) {
            if ($key === 'languages') {
                $setClause[] = "$key = ?";
                $params[] = arrayToJson($value);
            } else {
                $setClause[] = "$key = ?";
                $params[] = $value;
            }
        }
        
        // Add user ID to parameters
        $params[] = $id;
        
        $query = "UPDATE users SET " . implode(', ', $setClause) . " WHERE id = ?";
        
        $affectedRows = executeUpdate($query, $params);
        
        return $affectedRows > 0;
    } catch (Exception $e) {
        error_log('Error updating user: ' . $e->getMessage());
        return false;
    }
}

/**
 * Delete a user
 * 
 * @param int $id The user ID
 * @return bool True if deleted, false otherwise
 */
function deleteUser($id) {
    try {
        // First delete related records in user_played_challenges
        $query = "DELETE FROM user_played_challenges WHERE user_id = ?";
        executeUpdate($query, [$id]);
        
        // Then delete the user
        $query = "DELETE FROM users WHERE id = ?";
        $affectedRows = executeUpdate($query, [$id]);
        
        return $affectedRows > 0;
    } catch (Exception $e) {
        error_log('Error deleting user: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get user's played challenges
 * 
 * @param int $userId The user ID
 * @return array The challenge IDs played by the user
 */
function getUserPlayedChallenges($userId) {
    try {
        $query = "SELECT challenge_id FROM user_played_challenges WHERE user_id = ?";
        $result = executeQuery($query, [$userId]);
        
        if (!$result) {
            return [];
        }
        
        $rows = fetchAll($result);
        
        // Extract challenge IDs
        $challengeIds = [];
        foreach ($rows as $row) {
            $challengeIds[] = $row['challenge_id'];
        }
        
        return $challengeIds;
    } catch (Exception $e) {
        error_log('Error getting user played challenges: ' . $e->getMessage());
        return [];
    }
}

/**
 * Add a challenge to user's played challenges
 * 
 * @param int $userId The user ID
 * @param int $challengeId The challenge ID
 * @param bool $correct Whether the answer was correct
 * @return bool True if added, false otherwise
 */
function addUserPlayedChallenge($userId, $challengeId, $correct = false) {
    try {
        $query = "INSERT INTO user_played_challenges (user_id, challenge_id, correct) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE correct = ?";
        
        $params = [$userId, $challengeId, $correct, $correct];
        
        $result = executeInsert($query, $params);
        
        return $result !== false;
    } catch (Exception $e) {
        error_log('Error adding user played challenge: ' . $e->getMessage());
        return false;
    }
}

/**
 * Generate a JWT token for a user
 * 
 * @param array $user The user data
 * @return string The JWT token
 */
function generateToken($user) {
    $secret = getenv('JWT_SECRET');
    $expiresIn = getenv('JWT_EXPIRES_IN') ?: '30d';
    
    // Convert expiration time to seconds
    if (preg_match('/^(\d+)d$/', $expiresIn, $matches)) {
        $expiresInSeconds = $matches[1] * 24 * 60 * 60;
    } else {
        $expiresInSeconds = 30 * 24 * 60 * 60; // Default to 30 days
    }
    
    // Create token payload
    $payload = [
        'id' => $user['id'],
        'email' => $user['email'],
        'iat' => time(),
        'exp' => time() + $expiresInSeconds
    ];
    
    // Create JWT token
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($payload);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
} 