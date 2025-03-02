<?php
/**
 * Generate Challenges Script
 * Generates daily challenges
 */

require_once __DIR__ . '/../config/dotenv.php';
require_once __DIR__ . '/../models/Challenge.php';

// Load environment variables
loadEnv(__DIR__ . '/../../.env');

/**
 * Generate a daily challenge
 * 
 * @return array|null The created challenge or null if failed
 */
function generateDailyChallenge() {
    try {
        // Check if a challenge already exists for today
        $existingChallenge = getTodaysChallenge();
        
        if ($existingChallenge) {
            echo "Challenge already exists for today\n";
            return $existingChallenge;
        }
        
        // Get all challenges
        $query = "SELECT id, question, answer, type, difficulty FROM challenges";
        $result = executeQuery($query);
        
        if (!$result) {
            echo "Error querying challenges\n";
            return null;
        }
        
        $challenges = fetchAll($result);
        
        if (empty($challenges)) {
            echo "No challenges available\n";
            return null;
        }
        
        // Select a random challenge
        $randomIndex = rand(0, count($challenges) - 1);
        $selectedChallenge = $challenges[$randomIndex];
        
        // Create a new daily challenge
        $today = gmdate('Y-m-d');
        $query = "INSERT INTO daily_challenges (challenge_id, date) VALUES (?, ?)";
        $result = executeInsert($query, [$selectedChallenge['id'], $today]);
        
        if (!$result) {
            echo "Error creating daily challenge\n";
            return null;
        }
        
        echo "Challenge created successfully for $today\n";
        return $selectedChallenge;
    } catch (Exception $e) {
        echo "Error generating challenge: " . $e->getMessage() . "\n";
        return null;
    }
}

// Generate daily challenge
generateDailyChallenge(); 