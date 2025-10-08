#!/usr/bin/env python3
"""
Simple Email Configuration Test
"""

import os
from dotenv import load_dotenv

print("🔍 Testing Email Configuration...")
print("=" * 50)

# Load .env file
load_dotenv()
print("✅ Loaded .env file")

# Check each environment variable
env_vars = {
    'MAIL_SERVER': os.getenv('MAIL_SERVER'),
    'MAIL_PORT': os.getenv('MAIL_PORT'),
    'MAIL_USE_TLS': os.getenv('MAIL_USE_TLS'),
    'MAIL_USERNAME': os.getenv('MAIL_USERNAME'),
    'MAIL_PASSWORD': os.getenv('MAIL_PASSWORD'),
    'MAIL_DEFAULT_SENDER': os.getenv('MAIL_DEFAULT_SENDER'),
    'APP_URL': os.getenv('APP_URL')
}

print("\n📧 Environment Variables:")
for key, value in env_vars.items():
    if key == 'MAIL_PASSWORD':
        display_value = '*' * len(value) if value else 'NOT SET'
    else:
        display_value = value or 'NOT SET'
    print(f"  {key}: {display_value}")

# Check if all required variables are set
required_vars = ['MAIL_SERVER', 'MAIL_USERNAME', 'MAIL_PASSWORD']
missing_vars = [var for var in required_vars if not env_vars[var]]

if missing_vars:
    print(f"\n❌ Missing required variables: {', '.join(missing_vars)}")
    print("Please check your .env file!")
else:
    print("\n✅ All required email variables are set!")
    print("You can now test sending emails with the main application.")

print("\n" + "=" * 50)
