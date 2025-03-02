<?php
/**
 * Auth Controller
 * Handles authentication-related requests
 */

require_once __DIR__ . '/../models/User.php';

/**
 * Sign up a new user
 * 
 * @param array $data The request data
 */
function signup($data) {
    // Validate required fields
    if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide username, email, and password']);
        return;
    }
    
    // Check if email already exists
    $existingUser = findUserByEmail($data['email']);
    if ($existingUser) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Email already in use']);
        return;
    }
    
    // Create user
    $userData = [
        'username' => $data['username'],
        'email' => $data['email'],
        'password' => $data['password'],
        'score' => 0,
        'streak' => 0,
        'languages' => $data['languages'] ?? [],
        'last_played' => null,
        'played_challenges' => []
    ];
    
    $user = createUser($userData);
    
    if (!$user) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error creating user']);
        return;
    }
    
    // Generate token
    $token = generateToken($user);
    
    // Set cookie
    $cookieExpires = getenv('JWT_COOKIE_EXPIRES_IN') ?: 30;
    setcookie('jwt', $token, [
        'expires' => time() + $cookieExpires * 24 * 60 * 60,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'token' => $token,
        'data' => [
            'user' => $user
        ]
    ]);
}

/**
 * Log in a user
 * 
 * @param array $data The request data
 */
function login($data) {
    // Validate required fields
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide email and password']);
        return;
    }
    
    // Find user by email
    $user = findUserByEmail($data['email']);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Invalid email or password']);
        return;
    }
    
    // Verify password
    if (!password_verify($data['password'], $user['password'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Invalid email or password']);
        return;
    }
    
    // Remove password from user object
    unset($user['password']);
    
    // Generate token
    $token = generateToken($user);
    
    // Set cookie
    $cookieExpires = getenv('JWT_COOKIE_EXPIRES_IN') ?: 30;
    setcookie('jwt', $token, [
        'expires' => time() + $cookieExpires * 24 * 60 * 60,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'token' => $token,
        'data' => [
            'user' => $user
        ]
    ]);
}

/**
 * Log out a user
 */
function logout() {
    // Clear cookie
    setcookie('jwt', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Return success response
    echo json_encode(['status' => 'success']);
}

/**
 * Check if a user is logged in
 */
function isLoggedIn() {
    if (isAuthenticated()) {
        $user = getCurrentUser();
        echo json_encode([
            'status' => 'success',
            'data' => [
                'user' => $user
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    }
}

/**
 * Update a user's password
 * 
 * @param array $data The request data
 */
function updatePassword($data) {
    // Validate required fields
    if (!isset($data['currentPassword']) || !isset($data['newPassword'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide current password and new password']);
        return;
    }
    
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Get user with password
    $userWithPassword = findUserByEmail($user['email']);
    
    // Verify current password
    if (!password_verify($data['currentPassword'], $userWithPassword['password'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect']);
        return;
    }
    
    // Update password
    $updateData = [
        'password' => password_hash($data['newPassword'], PASSWORD_BCRYPT)
    ];
    
    $updated = updateUser($user['_id'], $updateData);
    
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error updating password']);
        return;
    }
    
    // Return success response
    echo json_encode(['status' => 'success', 'message' => 'Password updated successfully']);
}

/**
 * Send a password reset email
 * 
 * @param array $data The request data
 */
function forgotPassword($data) {
    // Validate required fields
    if (!isset($data['email'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide email']);
        return;
    }
    
    // Find user by email
    $user = findUserByEmail($data['email']);
    if (!$user) {
        // Don't reveal that the email doesn't exist
        echo json_encode(['status' => 'success', 'message' => 'If your email is registered, you will receive a password reset link']);
        return;
    }
    
    // Generate reset token
    $resetToken = bin2hex(random_bytes(32));
    $resetExpires = time() + 10 * 60 * 1000; // 10 minutes
    
    // Update user with reset token
    $updateData = [
        'passwordResetToken' => $resetToken,
        'passwordResetExpires' => new MongoDB\BSON\UTCDateTime($resetExpires)
    ];
    
    $updated = updateUser($user['_id'], $updateData);
    
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error generating reset token']);
        return;
    }
    
    // In a real application, send an email with the reset link
    // For now, just return the token in the response
    echo json_encode([
        'status' => 'success',
        'message' => 'If your email is registered, you will receive a password reset link',
        'resetToken' => $resetToken // Remove this in production
    ]);
}

/**
 * Reset a user's password
 * 
 * @param string $token The reset token
 * @param array $data The request data
 */
function resetPassword($token, $data) {
    // Validate required fields
    if (!isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide new password']);
        return;
    }
    
    try {
        $collection = getCollection('users');
        
        // Find user with valid reset token
        $user = $collection->findOne([
            'passwordResetToken' => $token,
            'passwordResetExpires' => [
                '$gt' => new MongoDB\BSON\UTCDateTime(time() * 1000)
            ]
        ]);
        
        if (!$user) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid or expired reset token']);
            return;
        }
        
        // Update password and clear reset token
        $updateData = [
            'password' => password_hash($data['password'], PASSWORD_BCRYPT),
            'passwordResetToken' => null,
            'passwordResetExpires' => null
        ];
        
        $updated = updateUser($user['_id'], $updateData);
        
        if (!$updated) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error resetting password']);
            return;
        }
        
        // Return success response
        echo json_encode(['status' => 'success', 'message' => 'Password reset successfully']);
    } catch (Exception $e) {
        error_log('Error resetting password: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error resetting password']);
    }
} 