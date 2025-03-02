<?php
/**
 * Router
 * Handles routing of API requests to the appropriate controllers
 */

// Include controllers
require_once __DIR__ . '/../controllers/authController.php';
require_once __DIR__ . '/../controllers/gameController.php';
require_once __DIR__ . '/../controllers/userController.php';

// Include middleware
require_once __DIR__ . '/../middleware/auth.php';

/**
 * Route the request to the appropriate controller
 * 
 * @param string $method The HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param string $route The request route (e.g. /auth/login)
 * @param array|null $body The request body for POST, PUT, PATCH requests
 */
function routeRequest($method, $route, $body = null) {
    // Auth routes
    if (preg_match('#^/auth/signup$#', $route) && $method === 'POST') {
        signup($body);
        return;
    }
    
    if (preg_match('#^/auth/login$#', $route) && $method === 'POST') {
        login($body);
        return;
    }
    
    if (preg_match('#^/auth/logout$#', $route) && $method === 'GET') {
        logout();
        return;
    }
    
    if (preg_match('#^/auth/check$#', $route) && $method === 'GET') {
        isLoggedIn();
        return;
    }
    
    if (preg_match('#^/auth/forgotPassword$#', $route) && $method === 'POST') {
        forgotPassword($body);
        return;
    }
    
    if (preg_match('#^/auth/resetPassword/([^/]+)$#', $route, $matches) && $method === 'PATCH') {
        resetPassword($matches[1], $body);
        return;
    }
    
    // Protected routes - require authentication
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        return;
    }
    
    // Game routes
    if (preg_match('#^/game/challenge$#', $route) && $method === 'GET') {
        getDailyChallenge();
        return;
    }
    
    if (preg_match('#^/game/daily-status$#', $route) && $method === 'GET') {
        getDailyStatus();
        return;
    }
    
    if (preg_match('#^/game/submit$#', $route) && $method === 'POST') {
        submitAnswer($body);
        return;
    }
    
    if (preg_match('#^/game/leaderboard$#', $route) && $method === 'GET') {
        getLeaderboard();
        return;
    }
    
    if (preg_match('#^/game/user-stats$#', $route) && $method === 'GET') {
        getUserStats();
        return;
    }
    
    if (preg_match('#^/game/admin/reset-player/([^/]+)$#', $route, $matches) && $method === 'POST') {
        resetPlayerLastPlay($matches[1]);
        return;
    }
    
    // User routes
    if (preg_match('#^/users/me$#', $route) && $method === 'GET') {
        getMe();
        return;
    }
    
    if (preg_match('#^/users/update-languages$#', $route) && $method === 'PATCH') {
        updateLanguages($body);
        return;
    }
    
    if (preg_match('#^/users/update-profile$#', $route) && $method === 'PATCH') {
        updateProfile($body);
        return;
    }
    
    if (preg_match('#^/users/delete-account$#', $route) && $method === 'DELETE') {
        deleteAccount();
        return;
    }
    
    if (preg_match('#^/auth/updatePassword$#', $route) && $method === 'PATCH') {
        updatePassword($body);
        return;
    }
    
    // Route not found
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Route not found']);
} 