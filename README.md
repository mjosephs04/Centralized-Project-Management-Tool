# Centralized Project Management Tool (TODD)

A comprehensive web-based project management system for managing projects, work orders, supplies, and team collaboration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running with Docker](#running-with-docker)
- [Running Locally (Development)](#running-locally-development)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose** (for containerized setup)
  - Docker Desktop: https://www.docker.com/products/docker-desktop
- **Python 3.12+** (for local development)
- **Node.js 20+** and **npm** (for frontend development)
- **MySQL 8.0+** (if running locally without Docker)

## Quick Start

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository
git clone <repository-url>
cd Centralized-Project-Management-Tool

# 2. Create a .env file (see Environment Variables section)
cp .env.example .env  # If you have an example file
# Or create .env manually with required variables

# 3. Start all services
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

#### Database Configuration
```env
# Database URL (automatically set in Docker Compose)
# For local development without Docker, use:
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3307/todd
```

#### Email Configuration (Required for invitations and password reset)
```env
# SMTP Server Settings
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USE_SSL=false

# Email Credentials
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@yourcompany.com

# Application URL (for invitation links)
APP_URL=http://localhost:3000
```

**Note for Gmail users:**
1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password: https://myaccount.google.com/apppasswords
3. Use the app password in `MAIL_PASSWORD` (not your regular password)

#### Security Keys (Required for production)
```env
# Secret keys for Flask sessions and JWT tokens
# Generate secure random strings for production
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
```

### Optional Variables

```env
# Environment (development/production)
ENV=development

# Frontend production mode
REACT_APP_ISPROD=false
```

### Google Cloud Storage (Optional - for profile picture uploads)

If you want to enable profile picture uploads, you'll need:

1. A Google Cloud Storage bucket (default: `profile_pics_capstone637485`)
2. A service account JSON key file
3. Mount the service account file in `docker-compose.yml`:
   ```yaml
   volumes:
     - ./your-service-account.json:/eng-copilot-471923-g2-0495f536051b.json
   ```

**Note:** Profile picture uploads will fail without proper GCS configuration, but the rest of the application will work.

### Environment Variable Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes* | Auto-set in Docker | MySQL connection string |
| `MAIL_SERVER` | Yes | `smtp.gmail.com` | SMTP server hostname |
| `MAIL_PORT` | Yes | `587` | SMTP server port |
| `MAIL_USE_TLS` | Yes | `true` | Enable TLS encryption |
| `MAIL_USERNAME` | Yes | - | Email account username |
| `MAIL_PASSWORD` | Yes | - | Email account password |
| `MAIL_DEFAULT_SENDER` | Yes | `noreply@projectmanagement.com` | Default sender email |
| `APP_URL` | Yes | `http://localhost:3000` | Frontend URL for links |
| `SECRET_KEY` | Production | `dev-secret-key-change-me` | Flask secret key |
| `JWT_SECRET_KEY` | Production | `dev-jwt-secret-key-change-me` | JWT signing key |
| `ENV` | No | - | Environment mode |
| `REACT_APP_ISPROD` | No | `false` | Frontend production mode |

*Required when not using Docker Compose

## Running with Docker

### Start Services

```bash
docker-compose up -d
```

This starts:
- **MySQL Database** on port `3307` (host) → `3306` (container)
- **Backend API** on port `8080`
- **Frontend** on port `3000`

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Services

```bash
docker-compose down
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

### Database Access

```bash
# Connect to MySQL from host
mysql -h 127.0.0.1 -P 3307 -u root -ppassword

# Or use MySQL Workbench
# Host: 127.0.0.1
# Port: 3307
# Username: root
# Password: password
```

## Running Locally (Development)

### Backend Setup

```bash
# 1. Navigate to backend directory
cd src/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables (create .env or export)
export DATABASE_URL="mysql+pymysql://root:password@127.0.0.1:3307/todd"
export MAIL_SERVER="smtp.gmail.com"
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-app-password"
# ... (set all required variables)

# 5. Run the application
python -m src.backend.app
# Or with gunicorn for production-like setup:
gunicorn -w 4 -b 0.0.0.0:8080 "src.backend.app:app"
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd src/frontend

# 2. Install dependencies
npm install

# 3. Set environment variable (optional)
export REACT_APP_ISPROD=false

# 4. Start development server
npm start

# Frontend will be available at http://localhost:3000
```

### Database Setup (Local MySQL)

If running MySQL locally (not in Docker):

```bash
# 1. Create database
mysql -u root -p
CREATE DATABASE todd;

# 2. Update DATABASE_URL in .env
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/todd
```

The application will automatically create all tables on first startup.

## Project Structure

```
Centralized-Project-Management-Tool/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile-backend          # Backend Docker image
├── Dockerfile-frontend         # Frontend Docker image
├── .env                        # Environment variables (create this)
├── check_env.py               # Email configuration checker
│
├── src/
│   ├── backend/
│   │   ├── app.py             # Flask application entry point
│   │   ├── config.py           # Configuration settings
│   │   ├── models.py           # Database models
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── projects.py         # Project endpoints
│   │   ├── workorders.py       # Work order endpoints
│   │   ├── messages.py         # Messaging endpoints
│   │   ├── email_service.py    # Email functionality
│   │   └── requirements.txt    # Python dependencies
│   │
│   └── frontend/
│       ├── package.json        # Node.js dependencies
│       ├── public/             # Static files
│       └── src/
│           ├── App.jsx         # Main React component
│           ├── pages/          # Page components
│           ├── components/     # Reusable components
│           └── services/
│               └── api.js      # API client
│
└── docs/
    ├── BackendAPI.md          # API documentation
    └── AccessManagement.md    # Access management docs
```

## Troubleshooting

### Email Not Working

1. **Check environment variables:**
   ```bash
   python check_env.py
   ```

2. **Gmail-specific issues:**
   - Ensure 2FA is enabled
   - Use app-specific password, not regular password
   - Check that "Less secure app access" is enabled (if not using app passwords)

3. **Test email configuration:**
   - Check backend logs: `docker-compose logs backend`
   - Look for email-related errors

### Database Connection Issues

1. **Docker setup:**
   ```bash
   # Check if database is running
   docker-compose ps
   
   # Check database logs
   docker-compose logs db
   
   # Restart database
   docker-compose restart db
   ```

2. **Local setup:**
   - Verify MySQL is running: `mysqladmin ping -h 127.0.0.1 -P 3307`
   - Check DATABASE_URL format
   - Ensure database exists: `CREATE DATABASE todd;`

### Frontend Can't Connect to Backend

1. **Check API URL:**
   - Development: `http://localhost:8080/api`
   - Production: Set `REACT_APP_ISPROD=true` and update API URL in `api.js`

2. **CORS issues:**
   - Backend CORS is configured to allow all origins in development
   - Check backend logs for CORS errors

### Port Already in Use

```bash
# Find process using port
# Linux/Mac:
lsof -i :8080
lsof -i :3000
lsof -i :3307

# Windows:
netstat -ano | findstr :8080
netstat -ano | findstr :3000

# Kill process or change ports in docker-compose.yml
```

### Profile Picture Upload Fails

- This feature requires Google Cloud Storage setup
- Without GCS, profile uploads will fail but other features work
- See "Google Cloud Storage" section above for setup

### Reset Everything

```bash
# Stop and remove all containers, volumes
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Additional Resources

- **API Documentation**: See `docs/BackendAPI.md`
- **Access Management**: See `docs/AccessManagement.md`
- **Backend Health Check**: `GET http://localhost:8080/api/health`

## Default Credentials

**Note:** Create your first admin user through the registration endpoint or database seed script.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation in `docs/`
3. Check application logs: `docker-compose logs`

