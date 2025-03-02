<?php
/**
 * User Controller
 * Handles user-related requests
 */

require_once __DIR__ . '/../models/User.php';

/**
 * Get the current user's data
 */
function getMe() {
    $user = getCurrentUser();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => $user
        ]
    ]);
}

/**
 * Update a user's languages
 * 
 * @param array $data The request data
 */
function updateLanguages($data) {
    // Validate required fields
    if (!isset($data['languages']) || !is_array($data['languages'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Please provide languages array']);
        return;
    }
    
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Update languages
    $updateData = [
        'languages' => $data['languages']
    ];
    
    $updated = updateUser($user['_id'], $updateData);
    
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error updating languages']);
        return;
    }
    
    // Get updated user
    $updatedUser = findUserById($user['_id']);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => $updatedUser
        ]
    ]);
}

/**
 * Update a user's profile
 * 
 * @param array $data The request data
 */
function updateProfile($data) {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Build update data
    $updateData = [];
    
    // Update username if provided
    if (isset($data['username'])) {
        $updateData['username'] = $data['username'];
    }
    
    // Update email if provided
    if (isset($data['email'])) {
        // Check if email already exists
        $existingUser = findUserByEmail($data['email']);
        if ($existingUser && (string)$existingUser['_id'] !== (string)$user['_id']) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Email already in use']);
            return;
        }
        
        $updateData['email'] = $data['email'];
    }
    
    // If no fields to update
    if (empty($updateData)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No fields to update']);
        return;
    }
    
    // Update user
    $updated = updateUser($user['_id'], $updateData);
    
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error updating profile']);
        return;
    }
    
    // Get updated user
    $updatedUser = findUserById($user['_id']);
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => $updatedUser
        ]
    ]);
}

/**
 * Delete a user's account
 */
function deleteAccount() {
    // Get current user
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
        return;
    }
    
    // Delete user
    $deleted = deleteUser($user['_id']);
    
    if (!$deleted) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Error deleting account']);
        return;
    }
    
    // Clear cookie
    setcookie('jwt', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Return success response
    echo json_encode(['status' => 'success', 'message' => 'Account deleted successfully']);
} 