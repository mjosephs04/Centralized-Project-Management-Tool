#!/usr/bin/env python3
"""
Email Configuration Test Script
Run this to test if your email settings are working correctly.
"""

import os
from flask import Flask
from flask_mail import Mail, Message

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️  python-dotenv not installed. Using system environment variables only.")
    print("   Install with: pip install python-dotenv")

def test_email_config():
    """Test email configuration"""
    
    # Create a minimal Flask app for testing
    app = Flask(__name__)
    
    # Load configuration from environment variables
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'false').lower() in ['true', 'on', '1']
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@projectmanagement.com')
    
    # Initialize mail
    mail = Mail(app)
    
    # Check configuration
    print("📧 Email Configuration Test")
    print("=" * 40)
    print(f"Server: {app.config['MAIL_SERVER']}")
    print(f"Port: {app.config['MAIL_PORT']}")
    print(f"Use TLS: {app.config['MAIL_USE_TLS']}")
    print(f"Username: {app.config['MAIL_USERNAME']}")
    print(f"Password: {'*' * len(app.config['MAIL_PASSWORD']) if app.config['MAIL_PASSWORD'] else 'NOT SET'}")
    print(f"Default Sender: {app.config['MAIL_DEFAULT_SENDER']}")
    print()
    
    # Validate configuration
    if not app.config['MAIL_USERNAME']:
        print("❌ MAIL_USERNAME is not set!")
        return False
    
    if not app.config['MAIL_PASSWORD']:
        print("❌ MAIL_PASSWORD is not set!")
        return False
    
    print("✅ Configuration looks good!")
    print()
    
    # Test sending email
    try:
        with app.app_context():
            msg = Message(
                subject='Test Email from Project Management System',
                recipients=[app.config['MAIL_USERNAME']],  # Send to yourself
                body='This is a test email to verify your email configuration is working correctly.',
                html='<h2>Email Configuration Test</h2><p>This is a test email to verify your email configuration is working correctly.</p>'
            )
            
            print("📤 Sending test email...")
            mail.send(msg)
            print("✅ Test email sent successfully!")
            print(f"📧 Check your inbox: {app.config['MAIL_USERNAME']}")
            return True
            
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        print()
        print("🔧 Troubleshooting tips:")
        print("1. Check your email credentials")
        print("2. Ensure 2FA is enabled and you're using an app password")
        print("3. Check if your email provider allows SMTP access")
        print("4. Verify firewall/antivirus isn't blocking the connection")
        return False

if __name__ == "__main__":
    print("Starting email configuration test...")
    print("Make sure you have set your environment variables first!")
    print()
    
    success = test_email_config()
    
    if success:
        print()
        print("🎉 Email configuration is working!")
        print("You can now use the invitation system.")
    else:
        print()
        print("💡 Need help? Check the documentation in docs/AccessManagement.md")
