<?php
/**
 * Authentication Middleware
 * Handles JWT authentication and user authorization
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Verify JWT token
 * 
 * @param string $token The JWT token to verify
 * @return array|false The decoded token payload or false if invalid
 */
function verifyToken($token) {
    $secret = getenv('JWT_SECRET');
    
    if (!$secret) {
        error_log('JWT_SECRET not found in environment variables');
        return false;
    }
    
    // Split the token
    $tokenParts = explode('.', $token);
    if (count($tokenParts) != 3) {
        return false;
    }
    
    $header = base64_decode($tokenParts[0]);
    $payload = base64_decode($tokenParts[1]);
    $signature_provided = $tokenParts[2];
    
    // Check if token is expired
    $payload = json_decode($payload, true);
    if (!isset($payload['exp']) || $payload['exp'] < time()) {
        return false;
    }
    
    // Verify signature
    $base64_url_header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64_url_payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64_url_header . "." . $base64_url_payload, $secret, true);
    $base64_url_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if ($base64_url_signature !== $signature_provided) {
        return false;
    }
    
    return $payload;
}

/**
 * Check if user is authenticated
 * 
 * @return bool True if authenticated, false otherwise
 */
function isAuthenticated() {
    // Get token from cookie or Authorization header
    $token = null;
    
    // Check cookie first
    if (isset($_COOKIE['jwt'])) {
        $token = $_COOKIE['jwt'];
    } 
    // Then check Authorization header
    elseif (isset($_SERVER['HTTP_AUTHORIZATION']) && preg_match('/Bearer\s(\S+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
        $token = $matches[1];
    }
    
    if (!$token) {
        return false;
    }
    
    // Verify token
    $decoded = verifyToken($token);
    if (!$decoded || !isset($decoded['id'])) {
        return false;
    }
    
    // Get user from database
    $user = findUserById($decoded['id']);
    if (!$user) {
        return false;
    }
    
    // Store user in global variable for later use
    global $currentUser;
    $currentUser = $user;
    
    return true;
}

/**
 * Get the current authenticated user
 * 
 * @return array|null The current user or null if not authenticated
 */
function getCurrentUser() {
    global $currentUser;
    return $currentUser ?? null;
} 