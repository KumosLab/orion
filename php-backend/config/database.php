<?php
/**
 * Database Connection
 * Handles connection to MariaDB
 */

// MariaDB connection
function getDatabaseConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            // Get database credentials from environment variables
            $db_host = getenv('DB_HOST') ?: 'localhost';
            $db_user = getenv('DB_USER');
            $db_pass = getenv('DB_PASS');
            $db_name = getenv('DB_NAME') ?: 'orion';
            
            if (!$db_user || !$db_pass) {
                throw new Exception('Database credentials not found in environment variables');
            }
            
            // Create connection
            $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
            
            // Check connection
            if ($conn->connect_error) {
                throw new Exception('Connection failed: ' . $conn->connect_error);
            }
            
            // Set charset to utf8mb4
            $conn->set_charset('utf8mb4');
        } catch (Exception $e) {
            error_log('Database Connection Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Database connection error']);
            exit;
        }
    }
    
    return $conn;
}

/**
 * Execute a query and return the result
 * 
 * @param string $query The SQL query
 * @param array $params The parameters to bind to the query
 * @param string $types The types of the parameters (i=integer, d=double, s=string, b=blob)
 * @return mysqli_result|bool The result of the query
 */
function executeQuery($query, $params = [], $types = '') {
    $conn = getDatabaseConnection();
    
    try {
        $stmt = $conn->prepare($query);
        
        if ($stmt === false) {
            throw new Exception('Error preparing statement: ' . $conn->error);
        }
        
        if (!empty($params)) {
            if (empty($types)) {
                // Auto-detect types if not provided
                $types = '';
                foreach ($params as $param) {
                    if (is_int($param)) {
                        $types .= 'i';
                    } elseif (is_float($param)) {
                        $types .= 'd';
                    } elseif (is_string($param)) {
                        $types .= 's';
                    } else {
                        $types .= 'b';
                    }
                }
            }
            
            // Bind parameters
            $stmt->bind_param($types, ...$params);
        }
        
        // Execute statement
        $stmt->execute();
        
        // Return result
        return $stmt->get_result();
    } catch (Exception $e) {
        error_log('Query Error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Execute a query and return the last inserted ID
 * 
 * @param string $query The SQL query
 * @param array $params The parameters to bind to the query
 * @param string $types The types of the parameters
 * @return int|false The last inserted ID or false on failure
 */
function executeInsert($query, $params = [], $types = '') {
    $conn = getDatabaseConnection();
    
    $result = executeQuery($query, $params, $types);
    
    if ($result === false) {
        return false;
    }
    
    return $conn->insert_id;
}

/**
 * Execute a query and return the number of affected rows
 * 
 * @param string $query The SQL query
 * @param array $params The parameters to bind to the query
 * @param string $types The types of the parameters
 * @return int|false The number of affected rows or false on failure
 */
function executeUpdate($query, $params = [], $types = '') {
    $conn = getDatabaseConnection();
    
    $result = executeQuery($query, $params, $types);
    
    if ($result === false) {
        return false;
    }
    
    return $conn->affected_rows;
}

/**
 * Fetch a single row from a result
 * 
 * @param mysqli_result $result The result to fetch from
 * @return array|null The fetched row or null if no more rows
 */
function fetchRow($result) {
    if ($result === false) {
        return null;
    }
    
    return $result->fetch_assoc();
}

/**
 * Fetch all rows from a result
 * 
 * @param mysqli_result $result The result to fetch from
 * @return array The fetched rows
 */
function fetchAll($result) {
    if ($result === false) {
        return [];
    }
    
    return $result->fetch_all(MYSQLI_ASSOC);
}

/**
 * Escape a string for use in a SQL query
 * 
 * @param string $string The string to escape
 * @return string The escaped string
 */
function escapeString($string) {
    $conn = getDatabaseConnection();
    return $conn->real_escape_string($string);
}

/**
 * Convert a PHP array to a JSON string for storage in a JSON column
 * 
 * @param array $array The array to convert
 * @return string The JSON string
 */
function arrayToJson($array) {
    return json_encode($array, JSON_UNESCAPED_UNICODE);
}

/**
 * Convert a JSON string from a JSON column to a PHP array
 * 
 * @param string $json The JSON string to convert
 * @return array The PHP array
 */
function jsonToArray($json) {
    return json_decode($json, true);
} 