# routes/booking.py

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from io import BytesIO
import os

from models import db, Booking, Company, User

# ---------------- Blueprint ---------------- #

booking_bp = Blueprint("booking", __name__)

# ---------------- Helper: parse date/time ---------------- #

def parse_date(date_str: str):
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def parse_time(time_str: str):
    return datetime.strptime(time_str, "%H:%M").time()


# ---------------- Companies list ---------------- #

@booking_bp.route("/companies", methods=["GET"])
@jwt_required(optional=True)  # จะมี token หรือไม่มีก็ได้ แต่ถ้า token เสียจะโดน handler JWT จัดการให้
def list_companies():
    companies = (
        Company.query.filter_by(is_active=True)
        .order_by(Company.name)
        .all()
    )
    return jsonify([c.to_dict() for c in companies])


# ---------------- Create booking ---------------- #

@booking_bp.route("", methods=["POST"])
@jwt_required()
def create_booking():
    # identity ใน access_token ตอนนี้เป็น user_id (string) เช่น "1"
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return jsonify({"message": "invalid token identity"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "user not found"}), 404

    data = request.get_json() or {}

    required_fields = [
        "company_id",
        "booking_date",
        "booking_time",
        "requester_name",
        "job_type",
        "detail",
        "department",
        "building",
        "floor",
        "contact_name",
        "contact_phone",
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

    return jsonify(
        {
            "message": "created",
            "booking": booking.to_dict(),
            "booking_id": booking.id,
        }
    ), 201


# ---------------- My bookings (ของ user นั้น) ---------------- #

@booking_bp.route("/my", methods=["GET"])
@jwt_required()
def my_bookings():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return jsonify({"message": "invalid token identity"}), 401

    bookings = (
        Booking.query.filter_by(created_by=user_id)
        .order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        .all()
    )
    return jsonify([b.to_dict() for b in bookings])


# ---------------- PDF export (ใบจองตามฟอร์มตัวอย่าง) ---------------- #

# ฟอนต์ไทย TH Sarabun (เอาไฟล์ THSarabunNew.ttf ไว้ที่ backend/fonts/)
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(BASE_DIR, "fonts")
THAI_FONT_PATH = os.path.join(FONT_DIR, "THSarabunNew.ttf")

try:
    pdfmetrics.registerFont(TTFont("THSarabun", THAI_FONT_PATH))
    print(f">>> Registered THSarabun from {THAI_FONT_PATH}")
except Exception as e:
    print(">>> WARNING: cannot register THSarabun:", e)


@booking_bp.route("/<int:booking_id>/pdf", methods=["GET"])
@jwt_required()
def generate_booking_pdf(booking_id):
    # join booking + company
    row = (
        db.session.query(Booking, Company)
        .join(Company, Booking.company_id == Company.id)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not row:
        return jsonify({"message": "booking not found"}), 404

    booking, company = row

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # ---------------- พื้นฐาน layout ----------------
    left = 40
    right = width - 40
    top = height - 40
    table_width = right - left
    row_height = 24
    label_col_width = 90

    c.setFont("THSarabun", 16)

    # =================== 1) กล่องบน: บริษัท / วันที่ / เวลา / ชื่อผู้แจ้ง / ประเภท ===================

    top_box_rows = 5
    top_box_height = top_box_rows * row_height

    # กรอบนอก
    c.rect(left, top - top_box_height, table_width, top_box_height)
    # เส้นแบ่งแนวตั้ง label / value
    c.line(left + label_col_width, top, left + label_col_width, top - top_box_height)
    # เส้นแนวนอนคั่นแต่ละบรรทัด
    for i in range(1, top_box_rows):
        y = top - i * row_height
        c.line(left, y, right, y)

    labels_top = ["บริษัท", "วันที่", "เวลา", "ชื่อผู้แจ้ง", "ประเภท"]
    values_top = [
        company.name or "",
        booking.booking_date.strftime("%d/%m/%Y") if booking.booking_date else "",
        booking.booking_time.strftime("%H:%M น.") if booking.booking_time else "",
        booking.requester_name or "",
        booking.job_type or "",
    ]

    y = top - row_height + 7
    for label, value in zip(labels_top, values_top):
        c.drawString(left + 5, y, label)
        c.drawString(left + label_col_width + 8, y, value)
        y -= row_height

    # =================== 2) กล่องกลาง: รายละเอียด ===================

    # ตำแหน่งบนของกล่องกลาง
    detail_top = top - top_box_height - 40

    first_row_height = row_height      # แถวแรก "รายละเอียด" + บรรทัดข้อความแรก
    body_height = 230                  # พื้นที่ว่างสำหรับรายละเอียดต่อ
    detail_height = first_row_height + body_height

    # กรอบนอก
    c.rect(left, detail_top - detail_height, table_width, detail_height)
    # เส้นแนวตั้ง ซ้าย/ขวา
    c.line(left + label_col_width, detail_top, left + label_col_width, detail_top - detail_height)
    # เส้นแนวนอนคั่นแถว label กับส่วน body
    #c.line(left, detail_top - first_row_height, right, detail_top - first_row_height)

    # ข้อความ "รายละเอียด"
    label_y = detail_top - first_row_height + 7
    c.drawString(left + 5, label_y, "รายละเอียด")

    # ข้อความรายละเอียด ให้ขึ้นต้นในแถวเดียวกันกับ "รายละเอียด"
    detail_text = booking.detail or ""
    text_obj = c.beginText()
    text_obj.setFont("THSarabun", 16)
    text_obj.setTextOrigin(left + label_col_width + 8, label_y)

    # ตัดบรรทัดง่าย ๆ ตาม \n และเลื่อนลงทีละ 18 pt
    max_body_bottom = detail_top - detail_height + 10
    for line in detail_text.split("\n"):
        if text_obj.getY() < max_body_bottom:
            break
        text_obj.textLine(line)

    c.drawText(text_obj)

    # =================== 3) กล่องล่าง: หน่วยงาน / อาคาร / ชั้น / ชื่อผู้ติดต่อ / เบอร์โทร ===================

    bottom_top = detail_top - detail_height - 40
    bottom_rows = 5
    bottom_height = bottom_rows * row_height

    # กรอบนอก
    c.rect(left, bottom_top - bottom_height, table_width, bottom_height)
    # เส้นแบ่งแนวตั้ง label / value
    c.line(left + label_col_width, bottom_top, left + label_col_width, bottom_top - bottom_height)
    # เส้นแนวนอนคั่นแต่ละบรรทัด (อันที่คุณบอกว่ายังไม่มี)
    for i in range(1, bottom_rows):
        y = bottom_top - i * row_height
        c.line(left, y, right, y)

    labels_bottom = ["หน่วยงาน", "อาคาร", "ชั้น", "ชื่อผู้ติดต่อ", "เบอร์โทร"]
    values_bottom = [
        booking.department or "",
        booking.building or "",
        booking.floor or "",
        booking.contact_name or "",
        booking.contact_phone or "",
    ]

    y = bottom_top - row_height + 7
    for label, value in zip(labels_bottom, values_bottom):
        c.drawString(left + 5, y, label)
        c.drawString(left + label_col_width + 8, y, value)
        y -= row_height

    # =================== 4) ส่วนลายเซ็น ===================

    sign_y = bottom_top - bottom_height - 50

    c.drawString( 70, sign_y + 25, "ผู้รับ ________________________________")
    c.drawString( 350, sign_y + 25, "ผู้ส่ง ________________________________")

    c.drawString( 100, sign_y, "วันที่ _____ / _____ / ________")
    c.drawString( 380, sign_y, "วันที่ _____ / _____ / ________")

    # =================== ปิดหน้า/ส่งไฟล์ ===================

    c.showPage()
    c.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"booking_{booking_id}.pdf",
        mimetype="application/pdf",
    )