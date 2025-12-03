from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db, User, Company
from config import Config
from routes.auth import auth_bp
from routes.booking import booking_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(booking_bp, url_prefix="/api/bookings")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    @app.cli.command("init-db")
    def init_db():
        """Initialize database and create example data"""
        with app.app_context():
            db.create_all()
            if not User.query.filter_by(username="admin").first():
                admin = User(username="admin", full_name="Admin", role="ADMIN", is_approver=True)
                admin.set_password("admin123")
                db.session.add(admin)
            if Company.query.count() == 0:
                c1 = Company(name="บริษัทตัวอย่าง A")
                c2 = Company(name="บริษัทตัวอย่าง B")
                db.session.add_all([c1, c2])
            db.session.commit()
            print("Database initialized.")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
