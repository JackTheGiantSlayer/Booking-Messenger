from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from models import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "username และ password จำเป็น"}), 400

    user = User.query.filter_by(username=username, is_active=True).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}), 401

    # ✅ ใช้ identity เป็น string ของ user.id (เข้ากับ PyJWT / flask-jwt-extended ทุกรุ่น)
    access_token = create_access_token(identity=str(user.id))

    return jsonify(
        {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "is_approver": user.is_approver,
            },
        }
    ), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()  # string เช่น "1"
    user_id = int(identity)
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "ไม่พบผู้ใช้"}), 404

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_approver": user.is_approver,
        }
    )