-- Initialize the TODD database
USE todd;

-- Create database if it doesn't exist (redundant but safe)
CREATE DATABASE IF NOT EXISTS todd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to todd_user
GRANT ALL PRIVILEGES ON todd.* TO 'todd_user'@'%';
FLUSH PRIVILEGES;
