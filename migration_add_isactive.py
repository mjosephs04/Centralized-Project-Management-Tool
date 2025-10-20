#!/usr/bin/env python3
"""
Database migration script to add isActive columns to all tables.
This script adds the isActive column to existing tables and sets all existing records to isActive=True.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from backend.config import Config

def run_migration():
    """Run the migration to add isActive columns to all tables"""
    
    # Create database engine
    engine = create_engine(Config.DATABASE_URL)
    
    # List of tables and their isActive column definitions
    tables_to_migrate = [
        ('users', 'ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL'),
        ('projects', 'ALTER TABLE projects ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL'),
        ('work_orders', 'ALTER TABLE work_orders ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL'),
        ('project_members', 'ALTER TABLE project_members ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL'),
        ('project_invitations', 'ALTER TABLE project_invitations ADD COLUMN isActive BOOLEAN DEFAULT TRUE NOT NULL'),
    ]
    
    try:
        with engine.connect() as connection:
            # Start a transaction
            trans = connection.begin()
            
            try:
                print("Starting migration to add isActive columns...")
                
                for table_name, alter_sql in tables_to_migrate:
                    try:
                        # Check if the column already exists
                        check_column_sql = text(f"""
                            SELECT COUNT(*) as count 
                            FROM information_schema.columns 
                            WHERE table_name = '{table_name}' 
                            AND column_name = 'isActive'
                        """)
                        
                        result = connection.execute(check_column_sql).fetchone()
                        
                        if result.count > 0:
                            print(f"✓ Column 'isActive' already exists in table '{table_name}'")
                        else:
                            print(f"Adding 'isActive' column to table '{table_name}'...")
                            connection.execute(text(alter_sql))
                            print(f"✓ Successfully added 'isActive' column to table '{table_name}'")
                            
                    except SQLAlchemyError as e:
                        print(f"✗ Error adding 'isActive' column to table '{table_name}': {e}")
                        raise
                
                # Commit the transaction
                trans.commit()
                print("\n🎉 Migration completed successfully!")
                print("All existing records have been set to isActive=True")
                
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
    engine = create_engine(Config.DATABASE_URL)
    
    tables_to_check = ['users', 'projects', 'work_orders', 'project_members', 'project_invitations']
    
    try:
        with engine.connect() as connection:
            print("\nVerifying migration...")
            
            for table_name in tables_to_check:
                try:
                    # Check if the column exists
                    check_column_sql = text(f"""
                        SELECT COUNT(*) as count 
                        FROM information_schema.columns 
                        WHERE table_name = '{table_name}' 
                        AND column_name = 'isActive'
                    """)
                    
                    result = connection.execute(check_column_sql).fetchone()
                    
                    if result.count > 0:
                        # Check the count of records with isActive=True
                        count_sql = text(f"SELECT COUNT(*) as count FROM {table_name} WHERE isActive = TRUE")
                        count_result = connection.execute(count_sql).fetchone()
                        
                        # Check total count
                        total_sql = text(f"SELECT COUNT(*) as count FROM {table_name}")
                        total_result = connection.execute(total_sql).fetchone()
                        
                        print(f"✓ Table '{table_name}': {count_result.count}/{total_result.count} records are active")
                    else:
                        print(f"✗ Column 'isActive' not found in table '{table_name}'")
                        
                except SQLAlchemyError as e:
                    print(f"✗ Error checking table '{table_name}': {e}")
                    
    except SQLAlchemyError as e:
        print(f"❌ Database connection error during verification: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Adding isActive Columns")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not os.path.exists('src/backend'):
        print("❌ Error: Please run this script from the project root directory")
        sys.exit(1)
    
    # Run the migration
    run_migration()
    
    # Verify the migration
    verify_migration()
    
    print("\n" + "=" * 60)
    print("Migration completed! Your application now supports soft deletion.")
    print("=" * 60)
