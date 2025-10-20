#!/usr/bin/env python3
"""
Database migration script to add role, workerType, and contractorExpirationDate columns to project_invitations table.
This script adds the new columns to support role-based invitations with contractor expiration dates.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from backend.config import Config

def run_migration():
    """Run the migration to add role-related columns to project_invitations table"""
    
    # Create database engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    # Define the new columns to add
    columns_to_add = [
        {
            'name': 'role',
            'sql': 'ALTER TABLE project_invitations ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT \'worker\'',
            'check_sql': "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'project_invitations' AND column_name = 'role'"
        },
        {
            'name': 'workerType',
            'sql': 'ALTER TABLE project_invitations ADD COLUMN "workerType" VARCHAR(20)',
            'check_sql': "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'project_invitations' AND column_name = 'workerType'"
        },
        {
            'name': 'contractorExpirationDate',
            'sql': 'ALTER TABLE project_invitations ADD COLUMN "contractorExpirationDate" DATE',
            'check_sql': "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'project_invitations' AND column_name = 'contractorExpirationDate'"
        }
    ]
    
    try:
        with engine.connect() as connection:
            # Start a transaction
            trans = connection.begin()
            
            try:
                print("Starting migration to add role-related columns to project_invitations...")
                
                for column_info in columns_to_add:
                    column_name = column_info['name']
                    alter_sql = column_info['sql']
                    check_sql = text(column_info['check_sql'])
                    
                    try:
                        # Check if the column already exists
                        result = connection.execute(check_sql).fetchone()
                        
                        if result.count > 0:
                            print(f"✓ Column '{column_name}' already exists in table 'project_invitations'")
                        else:
                            print(f"Adding '{column_name}' column to table 'project_invitations'...")
                            connection.execute(text(alter_sql))
                            print(f"✓ Successfully added '{column_name}' column to table 'project_invitations'")
                            
                    except SQLAlchemyError as e:
                        print(f"✗ Error adding '{column_name}' column to table 'project_invitations': {e}")
                        raise
                
                # Update existing invitations to have default role as 'worker'
                print("Updating existing invitations with default role...")
                update_sql = text("""
                    UPDATE project_invitations 
                    SET role = 'worker' 
                    WHERE role IS NULL OR role = ''
                """)
                result = connection.execute(update_sql)
                print(f"✓ Updated {result.rowcount} existing invitations with default role")
                
                # Commit the transaction
                trans.commit()
                print("\n🎉 Migration completed successfully!")
                print("All existing invitations have been updated with default role 'worker'")
                
            except Exception as e:
                # Rollback the transaction on error
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                print("Transaction rolled back. No changes were made.")
                raise
                
    except SQLAlchemyError as e:
        print(f"❌ Database connection error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

def verify_migration():
    """Verify that the migration was successful"""
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    columns_to_check = ['role', 'workerType', 'contractorExpirationDate']
    
    try:
        with engine.connect() as connection:
            print("\nVerifying migration...")
            
            for column_name in columns_to_check:
                try:
                    # Check if the column exists
                    check_column_sql = text(f"""
                        SELECT COUNT(*) as count 
                        FROM information_schema.columns 
                        WHERE table_name = 'project_invitations' 
                        AND column_name = '{column_name}'
                    """)
                    
                    result = connection.execute(check_column_sql).fetchone()
                    
                    if result.count > 0:
                        print(f"✓ Column '{column_name}' exists in table 'project_invitations'")
                        
                        # For role column, check the distribution of values
                        if column_name == 'role':
                            role_dist_sql = text("SELECT role, COUNT(*) as count FROM project_invitations GROUP BY role")
                            role_results = connection.execute(role_dist_sql).fetchall()
                            print(f"  Role distribution:")
                            for row in role_results:
                                print(f"    {row.role}: {row.count} invitations")
                    else:
                        print(f"✗ Column '{column_name}' not found in table 'project_invitations'")
                        
                except SQLAlchemyError as e:
                    print(f"✗ Error checking column '{column_name}': {e}")
                    
    except SQLAlchemyError as e:
        print(f"❌ Database connection error during verification: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 70)
    print("Database Migration: Adding Role Fields to Project Invitations")
    print("=" * 70)
    
    # Check if we're in the right directory
    if not os.path.exists('src/backend'):
        print("❌ Error: Please run this script from the project root directory")
        sys.exit(1)
    
    # Run the migration
    run_migration()
    
    # Verify the migration
    verify_migration()
    
    print("\n" + "=" * 70)
    print("Migration completed! Project invitations now support role-based invitations.")
    print("=" * 70)
