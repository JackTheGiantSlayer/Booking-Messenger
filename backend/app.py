from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db, User, Company
from routes.auth import auth_bp
from routes.booking import booking_bp
from routes.admin import admin_bp  # ★ blueprint ฝั่ง admin (report, manage bookings ฯลฯ)

jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # debug ดู config DB ตอน start
    print(">>> DATABASE =", app.config.get("SQLALCHEMY_DATABASE_URI"))

    # เปิด CORS สำหรับ /api/*
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # init extensions
    db.init_app(app)
    jwt.init_app(app)

    # ---------- register blueprints ---------- #
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(booking_bp, url_prefix="/api/bookings")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")  # ★ route สำหรับ admin

    # ---------- health check ---------- #
    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    # ---------- JWT error handlers ---------- #

    @jwt.unauthorized_loader
    def unauthorized_callback(reason: str):
        # ไม่มี token / header ผิดรูปแบบ
        print(">>> JWT unauthorized_loader:", reason)
        return jsonify({"msg": reason}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason: str):
        # token เสีย / decode ไม่ได้
        print(">>> JWT invalid_token_loader:", reason)
        return jsonify({"msg": reason}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        # token หมดอายุ
        print(">>> JWT expired_token_loader: token expired")
        return jsonify({"msg": "token expired"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        # token ถูก revoke (ถ้าใช้ blacklist)
        print(">>> JWT revoked_token_loader: token revoked")
        return jsonify({"msg": "token revoked"}), 401

    # ---------- CLI: flask init-db ---------- #
    @app.cli.command("init-db")
    def init_db():
        """flask init-db : สร้างตาราง + user admin + companies ตัวอย่าง"""
        with app.app_context():
            db.create_all()

            # สร้าง admin เริ่มต้นถ้ายังไม่มี
            if not User.query.filter_by(username="admin").first():
                admin = User(
                    username="admin",
                    full_name="Administrator",
                    role="ADMIN",
                    is_approver=True,
                    is_active=True,
                )
                admin.set_password("admin123")
                db.session.add(admin)
                print(" - created default admin: admin / admin123")

            # seed company ตัวอย่าง
            if Company.query.count() == 0:
                db.session.add_all(
                    [
                        Company(name="บริษัทตัวอย่าง A"),
                        Company(name="บริษัทตัวอย่าง B"),
                    ]
                )
                print(" - seeded companies")

            db.session.commit()
            print("Database initialized.")

    return app


if __name__ == "__main__":
    print(">>> starting Flask app.py")
    app = create_app()
    # ใช้ port 16000 ให้ตรงกับ REACT_APP_API_BASE_URL
    app.run(host="0.0.0.0", port=16000, debug=True)