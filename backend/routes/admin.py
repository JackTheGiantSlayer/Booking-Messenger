from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from io import BytesIO
import datetime as dt
import os

import pandas as pd
from sqlalchemy import func

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from models import db, User, Booking, Company

admin_bp = Blueprint("admin", __name__)

# -------------------- Thai Font Register --------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(BASE_DIR, "fonts")
THAI_FONT_PATH = os.path.join(FONT_DIR, "THSarabunNew.ttf")

try:
    pdfmetrics.registerFont(TTFont("THSarabun", THAI_FONT_PATH))
    print(f">>> Registered Thai font from {THAI_FONT_PATH}")
except Exception as e:
    print(">>> WARNING: Cannot register Thai font:", e)


# -------------------- Admin Only Middleware --------------------
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        try:
            user_id = int(identity)
        except Exception:
            return jsonify({"message": "invalid user"}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "user not found"}), 404
        if user.role != "ADMIN":
            return jsonify({"message": "admin only"}), 403

        return fn(*args, **kwargs)

    return wrapper


# -------------------- Dynamic Filtering Search Builder --------------------
def build_query_from_filters():
    """
    ใช้ร่วมกันทั้ง /report, /report/excel, /report/pdf
    filter ด้วย query string:
      ?start_date=YYYY-MM-DD
      ?end_date=YYYY-MM-DD
      ?status=PENDING|SUCCESS|CANCEL
      ?company_id=1
    """
    q = (
        db.session.query(Booking, Company)
        .join(Company, Booking.company_id == Company.id)
    )

    start = request.args.get("start_date")
    end = request.args.get("end_date")
    status = request.args.get("status")
    company_id = request.args.get("company_id")

    if start:
        try:
            q = q.filter(Booking.booking_date >= dt.date.fromisoformat(start))
        except Exception:
            pass

    if end:
        try:
            q = q.filter(Booking.booking_date <= dt.date.fromisoformat(end))
        except Exception:
            pass

    if status:
        q = q.filter(Booking.status == status)

    if company_id:
        try:
            q = q.filter(Booking.company_id == int(company_id))
        except Exception:
            pass

    q = q.order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
    return q.all()


def to_dict_list(rows):
    """
    แปลง (Booking, Company) → dict พร้อม field เสริมสำหรับ frontend + report
    """
    res = []
    for b, c in rows:
        d = b.to_dict()

        # ให้มี company_name แน่นอน
        d["company_name"] = c.name

        # ให้มี messenger_name แน่นอน (ถ้า model มี field นี้)
        if "messenger_name" not in d:
            d["messenger_name"] = getattr(b, "messenger_name", None)

        # alias สำหรับ frontend เดิมที่ใช้ approved_by_name
        if "approved_by_name" not in d or d["approved_by_name"] is None:
            d["approved_by_name"] = d.get("messenger_name")

        res.append(d)
    return res


# -------------------- 1) Get All Bookings (ใช้ใน MessengerSchedulePage) --------------------
@admin_bp.route("/bookings", methods=["GET"])
@jwt_required()
@admin_required
def get_all_bookings():
    rows = (
        db.session.query(Booking, Company)
        .join(Company, Booking.company_id == Company.id)
        .order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        .all()
    )
    return jsonify(to_dict_list(rows)), 200


# -------------------- 2) Generate JSON Report (หน้า Report) --------------------
@admin_bp.route("/report", methods=["GET"])
@jwt_required()
@admin_required
def report():
    rows = build_query_from_filters()
    return jsonify(to_dict_list(rows)), 200


# -------------------- 3) Excel Export --------------------
@admin_bp.route("/report/excel", methods=["GET"])
@jwt_required()
@admin_required
def report_excel():
    rows = build_query_from_filters()
    data = to_dict_list(rows)

    # เลือกเฉพาะคอลัมน์ที่ต้องใช้ใน Excel
    records = []
    for b in data:
        records.append(
            {
                "booking_date": b.get("booking_date", ""),
                "booking_time": b.get("booking_time", ""),
                "company_name": b.get("company_name", ""),
                "requester_name": b.get("requester_name", ""),
                "job_type": b.get("job_type", ""),
                "department": b.get("department", ""),
                "detail": b.get("detail", ""),
                "contact_name": b.get("contact_name", ""),
                "contact_phone": b.get("contact_phone", ""),
                "status": b.get("status", ""),
                "messenger_name": b.get("messenger_name", ""),
            }
        )

    df = pd.DataFrame(records)

    output = BytesIO()
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="messenger_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# -------------------- 4) PDF Export --------------------
@admin_bp.route("/report/pdf", methods=["GET"])
@jwt_required()
@admin_required
def report_pdf():
    rows = build_query_from_filters()
    data = to_dict_list(rows)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))

    styles = getSampleStyleSheet()
    cell = ParagraphStyle("cell", fontName="THSarabun", fontSize=12)

    headers = [
        "วันที่",
        "เวลา",
        "บริษัท",
        "ประเภทงาน",
        "ผู้แจ้ง",
        "หน่วยงาน",
        "รายละเอียด",
        "ผู้ติดต่อ",
        "เบอร์โทร",
        "สถานะ",
        "Messenger",
    ]

    table_data = [[Paragraph(h, cell) for h in headers]]

    for b in data:
        st = {
            "SUCCESS": "สำเร็จ",
            "PENDING": "รอดำเนินการ",
            "CANCEL": "ยกเลิก",
        }.get(b.get("status"), b.get("status", ""))

        table_data.append(
            [
                Paragraph(b.get("booking_date", "") or "", cell),
                Paragraph(b.get("booking_time", "") or "", cell),
                Paragraph(b.get("company_name", "") or "", cell),
                Paragraph(b.get("job_type", "") or "", cell),
                Paragraph(b.get("requester_name", "") or "", cell),
                Paragraph(b.get("department", "") or "", cell),
                Paragraph(b.get("detail", "") or "", cell),
                Paragraph(b.get("contact_name", "") or "", cell),
                Paragraph(b.get("contact_phone", "") or "", cell),
                Paragraph(st or "", cell),
                Paragraph(b.get("messenger_name") or "-", cell),
            ]
        )

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    doc.build([table])
    buffer.seek(0)

    return send_file(
        buffer,
        download_name="messenger_report.pdf",
        as_attachment=True,
        mimetype="application/pdf",
    )


# -------------------- 5) User CRUD --------------------
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def list_users():
    users = User.query.order_by(User.id).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route("/users", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    data = request.get_json() or {}

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "username and password required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "username already exists"}), 400

    u = User(
        username=username,
        full_name=data.get("full_name"),
        role=data.get("role", "USER"),
        is_active=data.get("is_active", True),
        is_approver=data.get("is_approver", False),
        email=data.get("email"),
        phone=data.get("phone"),
    )
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return jsonify({"id": u.id, "message": "created"}), 201


@admin_bp.route("/users/<int:id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_user(id):
    u = User.query.get(id)
    if not u:
        return jsonify({"message": "not found"}), 404

    data = request.get_json() or {}

    # รองรับการเปลี่ยน username ด้วย (กันซ้ำ)
    new_username = data.get("username", u.username)
    if new_username != u.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({"message": "username already exists"}), 400
        u.username = new_username

    u.full_name = data.get("full_name", u.full_name)
    u.role = data.get("role", u.role)
    u.is_active = data.get("is_active", u.is_active)
    u.is_approver = data.get("is_approver", u.is_approver)
    u.email = data.get("email", u.email)
    u.phone = data.get("phone", u.phone)

    db.session.commit()
    return jsonify({"message": "updated"}), 200


@admin_bp.route("/users/<int:id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_user(id):
    u = User.query.get(id)
    if not u:
        return jsonify({"message": "not found"}), 404
    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "deleted"}), 200


@admin_bp.route("/users/<int:user_id>/reset_password", methods=["POST"])
@jwt_required()
@admin_required
def reset_password(user_id):
    """
    Reset password สำหรับ user คนหนึ่ง (เรียกจากหน้า Admin)
    POST /api/admin/users/<user_id>/reset_password
    Body:
    {
      "password": "new_password"
    }
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "user not found"}), 404

    data = request.get_json() or {}
    new_password = data.get("password")
    if not new_password:
        return jsonify({"message": "password is required"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "password reset ok"}), 200


# -------------------- 6) Dashboard Summary --------------------
@admin_bp.route("/summary", methods=["GET"])
@jwt_required()
@admin_required
def summary():
    return jsonify(
        {
            "total_bookings": Booking.query.count(),
            "today_bookings": Booking.query.filter(
                Booking.booking_date == dt.date.today()
            ).count(),
            "total_users": User.query.count(),
        }
    ), 200


# -------------------- 7) Nivo Chart APIs --------------------
@admin_bp.route("/stats/daily-bookings", methods=["GET"])
@jwt_required()
@admin_required
def stats_daily_bookings():
    rows = (
        db.session.query(Booking.booking_date, func.count())
        .group_by(Booking.booking_date)
        .order_by(Booking.booking_date)
        .all()
    )
    return jsonify(
        [{"date": d.strftime("%Y-%m-%d"), "count": c} for d, c in rows]
    ), 200


@admin_bp.route("/stats/bookings-by-company", methods=["GET"])
@jwt_required()
@admin_required
def company_stats():
    rows = (
        db.session.query(Company.name, func.count())
        .join(Booking)
        .group_by(Company.id)
        .order_by(func.count().desc())
        .all()
    )
    return jsonify([{"company": n, "count": c} for n, c in rows]), 200


@admin_bp.route("/stats/bookings-by-status", methods=["GET"])
@jwt_required()
@admin_required
def status_stats():
    rows = db.session.query(Booking.status, func.count()).group_by(Booking.status).all()
    return jsonify(
        [{"id": s, "label": s, "value": c} for s, c in rows]
    ), 200


# -------------------- 8) PATCH Booking + Messenger Save --------------------
@admin_bp.route("/bookings/<int:id>/status", methods=["PATCH"])
@jwt_required()
@admin_required
def update_status(id):
    b = Booking.query.get(id)
    if not b:
        return jsonify({"message": "not found"}), 404

    data = request.get_json() or {}
    status = data.get("status")

    # รองรับทั้ง messenger_name และ approved_by_name จาก frontend
    messenger = data.get("messenger_name") or data.get("approved_by_name")

    if status:
        b.status = status

    if status == "SUCCESS":
        # ผู้อนุมัติ
        try:
            b.approved_by = int(get_jwt_identity())
        except Exception:
            pass
        b.approved_at = dt.datetime.utcnow()

        # ชื่อ Messenger (default "ขวัญเมือง" ถ้าไม่ส่งมา)
        b.messenger_name = messenger or "ขวัญเมือง"

    db.session.commit()
    return jsonify({"message": "updated"}), 200