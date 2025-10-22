#!/usr/bin/env python3
"""
Test actual email sending
"""

import os
from flask import Flask
from flask_mail import Mail, Message

# Load .env file manually
env_file = '.env'
if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"\'')
                os.environ[key.strip()] = value

def test_email_sending():
    """Test sending an actual email"""
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configure email
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', '')
    
    # Initialize mail
    mail = Mail(app)
    
    print("📧 Testing Email Sending...")
    print(f"📤 Sending test email to: {app.config['MAIL_USERNAME']}")
    
    try:
        with app.app_context():
            msg = Message(
                subject='🎉 Project Management System - Email Test',
                recipients=[app.config['MAIL_USERNAME']],
                body='This is a test email to verify your email configuration is working correctly!',
                html='''
                <h2>🎉 Email Configuration Test</h2>
                <p>This is a test email to verify your email configuration is working correctly!</p>
                <p>If you received this email, your email setup is working perfectly!</p>
                <hr>
                <p><small>Sent from Project Management System</small></p>
                '''
            )
            
            mail.send(msg)
            print("✅ Test email sent successfully!")
            print(f"📬 Check your inbox: {app.config['MAIL_USERNAME']}")
            print("📧 Also check your spam folder if you don't see it in inbox")
            return True
            
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        print("\n🔧 Common issues:")
        print("1. Check if you're using an App Password (not regular password)")
        print("2. Ensure 2-Factor Authentication is enabled")
        print("3. Check if 'Less secure app access' is enabled")
        print("4. Verify firewall isn't blocking SMTP")
        return False

if __name__ == "__main__":
    print("🚀 Starting email sending test...")
    print("=" * 50)
    
    success = test_email_sending()
    
    if success:
        print("\n🎉 SUCCESS! Your email configuration is working!")
        print("You can now use the invitation system in your project management tool.")
    else:
        print("\n💡 Need help? Check the troubleshooting section in docs/AccessManagement.md")
    
    print("=" * 50)
