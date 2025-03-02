-- Setup Database Schema for Orion
-- This script creates the necessary tables for the Orion application

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS orion;
USE orion;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    streak INT DEFAULT 0,
    languages JSON,
    last_played DATETIME DEFAULT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'code',
    difficulty VARCHAR(50) DEFAULT 'medium',
    date DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

-- User played challenges table (for tracking which challenges a user has played)
CREATE TABLE IF NOT EXISTS user_played_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    correct BOOLEAN DEFAULT FALSE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    UNIQUE KEY user_challenge (user_id, challenge_id)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_challenges_type ON challenges(type);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_daily_challenges_date ON daily_challenges(date); 