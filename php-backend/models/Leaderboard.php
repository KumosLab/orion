<?php
/**
 * Leaderboard Model
 * Handles leaderboard-related database operations
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Get the leaderboard
 * 
 * @param int $limit The maximum number of entries to return
 * @return array The leaderboard entries
 */
function getLeaderboard($limit = 10) {
    try {
        $query = "SELECT id, username, score, streak, languages 
                 FROM users 
                 WHERE score > 0 
                 ORDER BY score DESC 
                 LIMIT ?";
        
        $result = executeQuery($query, [$limit]);
        
        if (!$result) {
            return [];
        }
        
        $leaderboard = fetchAll($result);
        
        // Convert JSON strings to arrays
        foreach ($leaderboard as &$entry) {
            if (isset($entry['languages'])) {
                $entry['languages'] = jsonToArray($entry['languages']);
            } else {
                $entry['languages'] = [];
            }
        }
        
        return $leaderboard;
    } catch (Exception $e) {
        error_log('Error getting leaderboard: ' . $e->getMessage());
        return [];
    }
}

/**
 * Get a user's rank on the leaderboard
 * 
 * @param int $userId The user ID
 * @return int The user's rank (1-based) or 0 if not found
 */
function getUserRank($userId) {
    try {
        // Get user's score
        $user = findUserById($userId);
        if (!$user || !isset($user['score'])) {
            return 0;
        }
        
        // Count users with higher score
        $query = "SELECT COUNT(*) as count FROM users WHERE score > ?";
        $result = executeQuery($query, [$user['score']]);
        
        if (!$result) {
            return 0;
        }
        
        $row = fetchRow($result);
        
        // Rank is count + 1 (1-based)
        return $row['count'] + 1;
    } catch (Exception $e) {
        error_log('Error getting user rank: ' . $e->getMessage());
        return 0;
    }
}

/**
 * Update a user's score
 * 
 * @param int $userId The user ID
 * @param int $score The new score
 * @param int $streak The new streak
 * @return bool True if updated, false otherwise
 */
function updateUserScore($userId, $score, $streak) {
    try {
        $query = "UPDATE users SET score = ?, streak = ? WHERE id = ?";
        $affectedRows = executeUpdate($query, [$score, $streak, $userId]);
        
        return $affectedRows > 0;
    } catch (Exception $e) {
        error_log('Error updating user score: ' . $e->getMessage());
        return false;
    }
} 