-- Migration: Add role, workerType, and contractorExpirationDate columns to project_invitations table
-- This migration adds support for role-based invitations with contractor expiration dates

-- Add role column (required, defaults to 'worker')
ALTER TABLE project_invitations ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'worker';

-- Add workerType column (optional, for worker role invitations)
ALTER TABLE project_invitations ADD COLUMN "workerType" VARCHAR(20);

-- Add contractorExpirationDate column (optional, for contractor invitations)
ALTER TABLE project_invitations ADD COLUMN "contractorExpirationDate" DATE;

-- Update existing invitations to have default role as 'worker' (if any exist)
UPDATE project_invitations 
SET role = 'worker' 
WHERE role IS NULL OR role = '';

-- Add comments to document the new columns
COMMENT ON COLUMN project_invitations.role IS 'Role for the invited user: admin, worker, or project_manager';
COMMENT ON COLUMN project_invitations."workerType" IS 'Worker type for worker role invitations: contractor or crew_member';
COMMENT ON COLUMN project_invitations."contractorExpirationDate" IS 'Expiration date for contractor invitations (only applicable for contractor workerType)';
