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

    CORS(app)

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

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Initialize database tables at startup
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

