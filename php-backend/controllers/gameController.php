<?php
/**
 * Game Controller
 * Handles game-related requests
 */

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Challenge.php';
require_once __DIR__ . '/../models/Leaderboard.php';

/**
 * Get the daily challenge
 */
function getDailyChallenge() {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Get today's challenge
    $challenge = getTodaysChallenge();
    
    if (!$challenge) {
        // If no daily challenge, get a random one
        $challenge = getRandomChallenge();
        
        if (!$challenge) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'No challenges available']);
            return;
        }
    }
    
    // Remove answer from challenge
    unset($challenge['answer']);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'challenge' => $challenge
        ]
    ]);
}

/**
 * Get the daily challenge status
 */
function getDailyStatus() {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Check if user has played today
    $lastPlayed = isset($user['last_played']) ? $user['last_played'] : null;
    $playedToday = false;
    
    if ($lastPlayed) {
        // Convert MongoDB UTCDateTime to PHP DateTime
        $lastPlayedDate = new DateTime();
        $lastPlayedDate->setTimestamp($lastPlayed->toDateTime()->getTimestamp());
        
        // Get today's date in UTC
        $today = new DateTime('now', new DateTimeZone('UTC'));
        $today->setTime(0, 0, 0);
        
        // Check if last played is today
        $playedToday = $lastPlayedDate >= $today;
    }
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'playedToday' => $playedToday
        ]
    ]);
}

/**
 * Submit an answer
 * 
 * @param array $data The request data
 */
function submitAnswer($data) {
    // Validate required fields
    if (!isset($data['challengeId']) || !isset($data['answer'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide challengeId and answer']);
        return;
    }
    
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    try {
        // Get challenge
        $collection = getCollection('challenges');
        $challenge = $collection->findOne(['_id' => new MongoDB\BSON\ObjectId($data['challengeId'])]);
        
        if (!$challenge) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Challenge not found']);
            return;
        }
        
        // Convert MongoDB document to array
        $challenge = iterator_to_array($challenge);
        
        // Check if answer is correct
        $correct = strtolower(trim($data['answer'])) === strtolower(trim($challenge['answer']));
        
        // Update user's score and streak
        $score = $user['score'] ?? 0;
        $streak = $user['streak'] ?? 0;
        
        if ($correct) {
            $score += 10; // 10 points for correct answer
            $streak += 1; // Increment streak
        } else {
            $streak = 0; // Reset streak on wrong answer
        }
        
        // Update user's last played time and played challenges
        $updateData = [
            'score' => $score,
            'streak' => $streak,
            'last_played' => new MongoDB\BSON\UTCDateTime()
        ];
        
        // Add challenge to played challenges if not already there
        $playedChallenges = $user['played_challenges'] ?? [];
        if (!in_array($data['challengeId'], $playedChallenges)) {
            $playedChallenges[] = $data['challengeId'];
            $updateData['played_challenges'] = $playedChallenges;
        }
        
        // Update user
        $updated = updateUser($user['_id'], $updateData);
        
        if (!$updated) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error updating user data']);
            return;
        }
        
        // Get updated user
        $updatedUser = findUserById($user['_id']);
        
        // Return success response
        echo json_encode([
            'status' => 'success',
            'data' => [
                'correct' => $correct,
                'correctAnswer' => $challenge['answer'],
                'user' => $updatedUser
            ]
        ]);
    } catch (Exception $e) {
        error_log('Error submitting answer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error submitting answer']);
    }
}

/**
 * Get the leaderboard
 */
function getLeaderboard() {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Get leaderboard
    $leaderboard = getLeaderboard(10);
    
    // Get user's rank
    $rank = getUserRank($user['_id']);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'leaderboard' => $leaderboard,
            'userRank' => $rank
        ]
    ]);
}

/**
 * Get user stats
 */
function getUserStats() {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Get user's rank
    $rank = getUserRank($user['_id']);
    
    // Calculate challenges played
    $challengesPlayed = count($user['played_challenges'] ?? []);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => $user,
            'rank' => $rank,
            'challengesPlayed' => $challengesPlayed
        ]
    ]);
}

/**
 * Reset a player's last play time (admin only)
 * 
 * @param string $playerId The player ID to reset
 */
function resetPlayerLastPlay($playerId) {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Check if user is admin (you would need to add an isAdmin field to your user model)
    if (!isset($user['isAdmin']) || !$user['isAdmin']) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        return;
    }
    
    try {
        // Update player's last played time
        $collection = getCollection('users');
        $result = $collection->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($playerId)],
            [
                '$set' => [
                    'last_played' => null,
                    'updated_at' => new MongoDB\BSON\UTCDateTime()
                ]
            ]
        );
        
        if ($result->getModifiedCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Player not found']);
            return;
        }
        
        // Return success response
        echo json_encode(['status' => 'success', 'message' => 'Player reset successfully']);
    } catch (Exception $e) {
        error_log('Error resetting player: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error resetting player']);
    }
} 