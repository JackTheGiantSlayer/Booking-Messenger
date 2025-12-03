from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models import db, Booking, Company, User

booking_bp = Blueprint("booking", __name__)

def parse_date(date_str):
    return datetime.strptime(date_str, "%Y-%m-%d").date()

def parse_time(time_str):
    return datetime.strptime(time_str, "%H:%M").time()

@booking_bp.route("/companies", methods=["GET"])
@jwt_required(optional=True)
def list_companies():
    companies = Company.query.filter_by(is_active=True).order_by(Company.name).all()
    return jsonify([c.to_dict() for c in companies])

@booking_bp.route("", methods=["POST"])
@jwt_required()
def create_booking():
    identity = get_jwt_identity()
    user = User.query.get(identity["id"])
    if not user:
        return jsonify({"message": "user not found"}), 404

    data = request.get_json() or {}
    required_fields = [
        "company_id", "booking_date", "booking_time",
        "requester_name", "job_type", "detail",
        "department", "building", "floor",
        "contact_name", "contact_phone"
    ]
    for f in required_fields:
        if not data.get(f):
            return jsonify({"message": f"{f} is required"}), 400

    company = Company.query.get(data["company_id"])
    if not company:
        return jsonify({"message": "company not found"}), 404

    booking = Booking(
        company_id=company.id,
        booking_date=parse_date(data["booking_date"]),
        booking_time=parse_time(data["booking_time"]),
        requester_name=data["requester_name"],
        job_type=data["job_type"],
        detail=data["detail"],
        department=data["department"],
        building=data["building"],
        floor=data["floor"],
        contact_name=data["contact_name"],
        contact_phone=data["contact_phone"],
        status="PENDING",
        created_by=user.id,
    )
    db.session.add(booking)
    db.session.commit()

    return jsonify({"message": "created", "booking": booking.to_dict()}), 201

@booking_bp.route("/my", methods=["GET"])
@jwt_required()
def my_bookings():
    identity = get_jwt_identity()
    user_id = identity["id"]
    bookings = Booking.query.filter_by(created_by=user_id).order_by(Booking.booking_date.desc(), Booking.booking_time.desc()).all()
    return jsonify([b.to_dict() for b in bookings])
