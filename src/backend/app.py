from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config
from .models import db
from .auth import auth_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # Initialize database tables at startup
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

