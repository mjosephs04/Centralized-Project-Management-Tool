#!/usr/bin/env python3
"""
One-command setup script for supplies table.
This script will:
1. Create/update the supplies table schema based on the model
2. Populate the supplies catalog from LSGS_Supplies_FinalCleaned.xlsx

Run with: python setup_supplies.py
Or in Docker: docker-compose exec backend python /app/setup_supplies.py
"""

import os
import sys
from decimal import Decimal

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.app import create_app
from backend.models import db, Supply, SupplyStatus, BuildingSupply, ElectricalSupply

def normalize_column_name(col_name):
    """Normalize column names to handle variations"""
    if col_name is None:
        return None
    normalized = str(col_name).strip().lower()
    normalized = normalized.replace('_', '').replace('-', '').replace(' ', '')
    return normalized

def find_column(df, possible_names):
    """Find a column in the dataframe by trying multiple possible names"""
    normalized_cols = {normalize_column_name(col): col for col in df.columns}
    for name in possible_names:
        normalized = normalize_column_name(name)
        if normalized in normalized_cols:
            return normalized_cols[normalized]
    return None

def setup_supplies(excel_file_path=None):
    """Complete setup: create schema and populate supplies"""
    
    # Default paths - try Docker path first, then local
    if excel_file_path is None:
        docker_path = '/app/LSGS_Supplies_FinalCleaned.xlsx'
        local_path = 'LSGS_Supplies_FinalCleaned.xlsx'
        if os.path.exists(docker_path):
            excel_file_path = docker_path
        elif os.path.exists(local_path):
            excel_file_path = local_path
        else:
            print(f"❌ Error: Could not find Excel file. Tried: {docker_path} and {local_path}")
            return False
    
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("SUPPLIES SETUP")
        print("=" * 60)
        
        # Step 1: Ensure database schema is up to date
        print("\n📋 Step 1: Creating/updating database schema...")
        try:
            # Create all tables (this will create new tables or update existing ones)
            db.create_all()
            print("✓ Database schema is up to date")
        except Exception as e:
            print(f"❌ Error creating schema: {e}")
            return False
        
        # Step 2: Ensure columns exist (handle case where table exists but columns don't)
        print("\n📋 Step 2: Ensuring all columns exist...")
        try:
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            table_names = inspector.get_table_names()
            
            if 'supplies' in table_names:
                existing_columns = {col['name'] for col in inspector.get_columns('supplies')}
                
                required_columns = {
                    'referenceCode': 'VARCHAR(100)',
                    'supplyCategory': 'VARCHAR(200)',
                    'supplyType': 'VARCHAR(200)',
                    'supplySubtype': 'VARCHAR(200)',
                    'unitOfMeasure': 'VARCHAR(50)',
                    'status': "VARCHAR(20) NOT NULL DEFAULT 'PENDING'",
                    'requestedById': 'INT',
                    'approvedById': 'INT'
                }
                
                for col_name, col_type in required_columns.items():
                    if col_name not in existing_columns:
                        print(f"  Adding missing column: {col_name}...")
                        try:
                            db.session.execute(text(f"ALTER TABLE supplies ADD COLUMN {col_name} {col_type}"))
                            db.session.commit()
                            print(f"  ✓ Added {col_name}")
                        except Exception as e:
                            print(f"  ⚠️  Could not add {col_name}: {e}")
                            db.session.rollback()
                
                # Ensure projectId and vendor are nullable
                try:
                    db.session.execute(text("ALTER TABLE supplies MODIFY COLUMN projectId INT NULL"))
                    db.session.commit()
                except:
                    db.session.rollback()
                
                try:
                    db.session.execute(text("ALTER TABLE supplies MODIFY COLUMN vendor VARCHAR(200) NULL"))
                    db.session.commit()
                except:
                    db.session.rollback()
                
                # Fix status enum values if needed
                try:
                    db.session.execute(text("UPDATE supplies SET status = 'PENDING' WHERE status = 'pending'"))
                    db.session.execute(text("UPDATE supplies SET status = 'APPROVED' WHERE status = 'approved'"))
                    db.session.execute(text("UPDATE supplies SET status = 'REJECTED' WHERE status = 'rejected'"))
                    db.session.commit()
                except:
                    db.session.rollback()
            
            print("✓ All columns verified")
        except Exception as e:
            print(f"⚠️  Warning: Could not verify columns: {e}")
            # Continue anyway - create_all should handle it
        
        # Step 3: Read Excel file sheets
        print(f"\n📋 Step 3: Reading Excel file: {excel_file_path}")
        try:
            excel_file = pd.ExcelFile(excel_file_path)
            sheet_names = excel_file.sheet_names
            print(f"✓ Found sheets: {sheet_names}")
            
            # Read both sheets
            building_df = None
            electrical_df = None
            
            if 'Building Supplies' in sheet_names:
                building_df = pd.read_excel(excel_file_path, sheet_name='Building Supplies')
                print(f"✓ Loaded {len(building_df)} rows from 'Building Supplies' sheet")
            else:
                print("⚠️  Warning: 'Building Supplies' sheet not found")
            
            if 'Electric Supplies' in sheet_names:
                electrical_df = pd.read_excel(excel_file_path, sheet_name='Electric Supplies')
                print(f"✓ Loaded {len(electrical_df)} rows from 'Electric Supplies' sheet")
            else:
                print("⚠️  Warning: 'Electric Supplies' sheet not found")
                
        except Exception as e:
            print(f"❌ Error reading Excel file: {e}")
            return False
        
        # Helper function to populate supplies from a dataframe
        def populate_supplies(df, supply_class, supply_type_name):
            if df is None or len(df) == 0:
                print(f"\n📋 Skipping {supply_type_name} (no data)")
                return 0, 0, 0
            
            print(f"\n📋 Step 4: Processing {supply_type_name}...")
            
            # Map columns
            name_col = find_column(df, ['name', 'supply name', 'item name', 'description', 'item'])
            ref_code_col = find_column(df, ['reference code', 'ref code', 'code', 'referencecode', 'refcode'])
            category_col = find_column(df, ['supply category', 'category', 'supplycategory'])
            type_col = find_column(df, ['supply type', 'type', 'supplytype'])
            subtype_col = find_column(df, ['supply subtype', 'subtype', 'sub type', 'supplysubtype'])
            unit_col = find_column(df, ['unit of measure', 'unit', 'uom', 'unitofmeasure', 'measure'])
            budget_col = find_column(df, ['budget', 'unit price', 'price', 'cost', 'amount', 'value'])
            vendor_col = find_column(df, ['vendor', 'supplier', 'manufacturer'])
            
            if not name_col:
                print(f"❌ Error: Could not find a 'name' column in {supply_type_name}")
                print("Available columns:", list(df.columns))
                return 0, 0, 0
            
            print(f"  ✓ Name: {name_col}")
            print(f"  ✓ Reference Code: {ref_code_col}")
            print(f"  ✓ Category: {category_col}")
            print(f"  ✓ Type: {type_col}")
            print(f"  ✓ Subtype: {subtype_col}")
            print(f"  ✓ Unit of Measure: {unit_col}")
            print(f"  ✓ Budget/Price: {budget_col}")
            print(f"  ✓ Vendor: {vendor_col}")
            
            # Check existing supplies
            existing_count = supply_class.query.filter_by(projectId=None).count()
            if existing_count > 0:
                print(f"  Found {existing_count} existing {supply_type_name.lower()}")
                print("  Will add new supplies (skipping duplicates)")
            
            # Populate supplies
            added_count = 0
            skipped_count = 0
            error_count = 0
            
            for index, row in df.iterrows():
                try:
                    # Extract name
                    name = str(row[name_col]).strip() if pd.notna(row[name_col]) else None
                    if not name or name.lower() in ['nan', 'none', '']:
                        skipped_count += 1
                        continue
                    
                    # Check for duplicate
                    existing = None
                    if ref_code_col and pd.notna(row[ref_code_col]):
                        ref_code = str(row[ref_code_col]).strip()
                        existing = supply_class.query.filter_by(
                            name=name,
                            referenceCode=ref_code,
                            projectId=None
                        ).first()
                    else:
                        existing = supply_class.query.filter_by(
                            name=name,
                            projectId=None
                        ).first()
                    
                    if existing:
                        skipped_count += 1
                        continue
                    
                    # Create new supply record
                    supply = supply_class(
                        name=name,
                        referenceCode=str(row[ref_code_col]).strip() if ref_code_col and pd.notna(row[ref_code_col]) else None,
                        supplyCategory=str(row[category_col]).strip() if category_col and pd.notna(row[category_col]) else None,
                        supplyType=str(row[type_col]).strip() if type_col and pd.notna(row[type_col]) else None,
                        supplySubtype=str(row[subtype_col]).strip() if subtype_col and pd.notna(row[subtype_col]) else None,
                        unitOfMeasure=str(row[unit_col]).strip() if unit_col and pd.notna(row[unit_col]) else None,
                        vendor=str(row[vendor_col]).strip() if vendor_col and pd.notna(row[vendor_col]) else None,
                        budget=Decimal(str(row[budget_col])) if budget_col and pd.notna(row[budget_col]) else Decimal('0.00'),
                        status=SupplyStatus.PENDING,
                        projectId=None
                    )
                    
                    db.session.add(supply)
                    added_count += 1
                    
                    # Commit in batches of 100
                    if added_count % 100 == 0:
                        try:
                            db.session.commit()
                            print(f"  Processed {added_count} {supply_type_name.lower()}...")
                        except Exception as e:
                            db.session.rollback()
                            error_count += 1
                            added_count -= 1
                            continue
                        
                except Exception as e:
                    error_count += 1
                    db.session.rollback()
                    continue
            
            return added_count, skipped_count, error_count
        
        # Step 4: Populate building supplies
        building_added, building_skipped, building_errors = populate_supplies(
            building_df, BuildingSupply, "Building Supplies"
        )
        
        # Step 5: Populate electrical supplies
        electrical_added, electrical_skipped, electrical_errors = populate_supplies(
            electrical_df, ElectricalSupply, "Electrical Supplies"
        )
        
        # Final commit
        try:
            db.session.commit()
            print(f"\n✅ Setup completed successfully!")
            print(f"\n   Building Supplies:")
            print(f"      Added: {building_added}")
            print(f"      Skipped: {building_skipped}")
            if building_errors > 0:
                print(f"      Errors: {building_errors}")
            print(f"\n   Electrical Supplies:")
            print(f"      Added: {electrical_added}")
            print(f"      Skipped: {electrical_skipped}")
            if electrical_errors > 0:
                print(f"      Errors: {electrical_errors}")
            
            # Verify
            total_building = BuildingSupply.query.filter_by(projectId=None).count()
            total_electrical = ElectricalSupply.query.filter_by(projectId=None).count()
            print(f"\n   Total catalog supplies:")
            print(f"      Building: {total_building}")
            print(f"      Electrical: {total_electrical}")
            print("=" * 60)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"\n❌ Error committing to database: {e}")
            return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Setup supplies table (schema + data)')
    parser.add_argument('--file', '-f', default=None,
                       help='Path to Excel file (default: auto-detect)')
    
    args = parser.parse_args()
    
    if args.file and not os.path.exists(args.file):
        print(f"❌ Error: File not found: {args.file}")
        sys.exit(1)
    
    success = setup_supplies(args.file)
    sys.exit(0 if success else 1)

