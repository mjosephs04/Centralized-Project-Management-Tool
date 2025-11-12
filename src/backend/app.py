import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail

from .config import Config
from .models import db
from .auth import auth_bp
from .projects import projects_bp
from .workorders import workorders_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS - allow all origins for now
    # TODO: Restrict to specific origins in production for security
    # Note: Using "*" requires supports_credentials=False
    CORS(
        app,
        resources={r"/api/*": {
            "origins": "*",  # Allow all origins
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "expose_headers": ["Authorization"],
        }},
        supports_credentials=False,  # Must be False when using "*" for origins
    )

    db.init_app(app)
    jwt = JWTManager(app)
    mail = Mail(app)

    # JWT Identity Loader
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        return str(user)  # Convert user ID to string

    # JWT Error Handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": f"Invalid token: {str(error)}"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization header is required"}), 401

    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(workorders_bp)

    env = os.getenv("ENV", "development")
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            # Log error but don't crash the app
            app.logger.warning(f"Could not create database tables: {e}")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

