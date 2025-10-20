-- Database Migration: Add isActive columns to all tables
-- This script adds the isActive column to existing tables and sets all existing records to isActive=True

-- Add isActive column to users table
ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL;

-- Add isActive column to projects table  
ALTER TABLE projects ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL;

-- Add isActive column to work_orders table
ALTER TABLE work_orders ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL;

-- Add isActive column to project_members table
ALTER TABLE project_members ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL;

-- Add isActive column to project_invitations table
ALTER TABLE project_invitations ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL;

-- Verify the migration by checking that all records are active
SELECT 'users' as table_name, COUNT(*) as total_records, SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) as active_records FROM users
UNION ALL
SELECT 'projects', COUNT(*), SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) FROM projects
UNION ALL
SELECT 'work_orders', COUNT(*), SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) FROM work_orders
UNION ALL
SELECT 'project_members', COUNT(*), SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) FROM project_members
UNION ALL
SELECT 'project_invitations', COUNT(*), SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) FROM project_invitations;
