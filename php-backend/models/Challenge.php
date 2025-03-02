<?php
/**
 * Challenge Model
 * Handles challenge-related database operations
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Get today's challenge
 * 
 * @return array|null The challenge data or null if not found
 */
function getTodaysChallenge() {
    try {
        // Get today's date in UTC
        $today = gmdate('Y-m-d');
        
        $query = "SELECT c.id, c.question, c.answer, c.type, c.difficulty, dc.date 
                 FROM daily_challenges dc
                 JOIN challenges c ON dc.challenge_id = c.id
                 WHERE DATE(dc.date) = ?";
        
        $result = executeQuery($query, [$today]);
        
        if (!$result) {
            return null;
        }
        
        $challenge = fetchRow($result);
        
        return $challenge;
    } catch (Exception $e) {
        error_log('Error getting today\'s challenge: ' . $e->getMessage());
        return null;
    }
}

/**
 * Get a random challenge
 * 
 * @param array $excludeTypes Types to exclude
 * @param bool $unique Whether to get a unique challenge (not played by the user)
 * @param int $userId The user ID
 * @return array|null The challenge data or null if not found
 */
function getRandomChallenge($excludeTypes = [], $unique = false, $userId = null) {
    try {
        $whereClause = [];
        $params = [];
        
        // Exclude types if specified
        if (!empty($excludeTypes)) {
            $placeholders = implode(',', array_fill(0, count($excludeTypes), '?'));
            $whereClause[] = "type NOT IN ($placeholders)";
            $params = array_merge($params, $excludeTypes);
        }
        
        // Get unique challenge if specified
        if ($unique && $userId) {
            $whereClause[] = "id NOT IN (
                SELECT challenge_id FROM user_played_challenges WHERE user_id = ?
            )";
            $params[] = $userId;
        }
        
        // Build WHERE clause
        $whereClauseSql = empty($whereClause) ? '' : 'WHERE ' . implode(' AND ', $whereClause);
        
        // Count matching challenges
        $countQuery = "SELECT COUNT(*) as count FROM challenges $whereClauseSql";
        $countResult = executeQuery($countQuery, $params);
        
        if (!$countResult) {
            return null;
        }
        
        $countRow = fetchRow($countResult);
        $count = $countRow['count'];
        
        if ($count === 0) {
            return null;
        }
        
        // Get random challenge
        $random = rand(0, $count - 1);
        $query = "SELECT id, question, answer, type, difficulty FROM challenges $whereClauseSql LIMIT 1 OFFSET ?";
        $params[] = $random;
        
        $result = executeQuery($query, $params);
        
        if (!$result) {
            return null;
        }
        
        $challenge = fetchRow($result);
        
        return $challenge;
    } catch (Exception $e) {
        error_log('Error getting random challenge: ' . $e->getMessage());
        return null;
    }
}

/**
 * Create a new challenge
 * 
 * @param array $challengeData The challenge data
 * @return array|null The created challenge data or null if failed
 */
function createChallenge($challengeData) {
    try {
        $query = "INSERT INTO challenges (question, answer, type, difficulty) 
                 VALUES (?, ?, ?, ?)";
        
        $params = [
            $challengeData['question'],
            $challengeData['answer'],
            $challengeData['type'] ?? 'code',
            $challengeData['difficulty'] ?? 'medium'
        ];
        
        $challengeId = executeInsert($query, $params);
        
        if (!$challengeId) {
            return null;
        }
        
        // If date is provided, create a daily challenge
        if (isset($challengeData['date'])) {
            $date = $challengeData['date'] instanceof DateTime 
                ? $challengeData['date']->format('Y-m-d') 
                : gmdate('Y-m-d');
                
            $query = "INSERT INTO daily_challenges (challenge_id, date) VALUES (?, ?)";
            executeInsert($query, [$challengeId, $date]);
        }
        
        // Get the inserted challenge
        $query = "SELECT id, question, answer, type, difficulty FROM challenges WHERE id = ?";
        $result = executeQuery($query, [$challengeId]);
        
        if (!$result) {
            return null;
        }
        
        return fetchRow($result);
    } catch (Exception $e) {
        error_log('Error creating challenge: ' . $e->getMessage());
        return null;
    }
}

/**
 * Get a challenge by ID
 * 
 * @param int $id The challenge ID
 * @return array|null The challenge data or null if not found
 */
function getChallengeById($id) {
    try {
        $query = "SELECT id, question, answer, type, difficulty FROM challenges WHERE id = ?";
        $result = executeQuery($query, [$id]);
        
        if (!$result) {
            return null;
        }
        
        return fetchRow($result);
    } catch (Exception $e) {
        error_log('Error getting challenge by ID: ' . $e->getMessage());
        return null;
    }
} 