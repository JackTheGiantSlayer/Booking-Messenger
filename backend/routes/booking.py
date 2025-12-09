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
    """
    รองรับทั้งรูปแบบเวลา:
      - HH:MM:SS   เช่น 11:59:59, 16:29:59
      - HH:MM      เผื่อในอนาคตส่งมาแค่ชั่วโมง:นาที
    """
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(time_str, fmt).time()
        except ValueError:
            continue
    # ถ้าไม่มี format ไหน match เลยให้ throw error ออกไป
    raise ValueError(f"Invalid time format: {time_str}")


# ---------------- Companies list ---------------- #

@booking_bp.route("/companies", methods=["GET"])
@jwt_required(optional=True)  # will accept both with/without token
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
        # building / floor ไม่บังคับแล้ว
        "contact_name",
        "contact_phone",
    ]
    for f in required_fields:
        if not data.get(f):
            return jsonify({"message": f"{f} is required"}), 400

    company = Company.query.get(data["company_id"])
    if not company:
        return jsonify({"message": "company not found"}), 404

    try:
        booking_time_obj = parse_time(data["booking_time"])
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    booking = Booking(
        company_id=company.id,
        booking_date=parse_date(data["booking_date"]),
        booking_time=booking_time_obj,
        requester_name=data["requester_name"],
        job_type=data["job_type"],
        detail=data["detail"],
        department=data["department"],
        building=data.get("building") or "",
        floor=data.get("floor") or "",
        contact_name=data["contact_name"],
        contact_phone=data["contact_phone"],
        status="PENDING",
        created_by=user.id,
        # messenger_name จะถูกเซ็ตทีหลังตอน admin กด Completed
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

    font_name = "THSarabun"
    font_size = 16
    c.setFont(font_name, font_size)

    # ความกว้างฝั่ง value (ใช้ truncate/wrap)
    value_max_width = table_width - label_col_width - 16

    # ---------- helper: ตัดข้อความให้ไม่เกินความกว้าง cell ---------- #
    def shorten_to_width(text, max_width: float) -> str:
        if not text:
            return ""
        s = str(text)
        if c.stringWidth(s, font_name, font_size) <= max_width:
            return s
        while s and c.stringWidth(s + "...", font_name, font_size) > max_width:
            s = s[:-1]
        return (s + "...") if s else "..."

    # ---------- helper: wrap ข้อความหลายบรรทัด (ใช้กับรายละเอียด/หน่วยงาน) ---------- #
    def wrap_text(text):
        lines = []
        for raw_line in (text or "").split("\n"):
            words = raw_line.split(" ")
            current = ""
            for w in words:
                test = (current + " " + w).strip()
                if c.stringWidth(test, font_name, font_size) <= value_max_width:
                    current = test
                else:
                    if current:
                        lines.append(current)
                    current = w
            if current:
                lines.append(current)
        return lines

    # ---------- helper: format เวลา + ช่วงเช้า/บ่าย ---------- #
    def format_booking_time(t) -> str:
        if not t:
            return ""
        raw = t.strftime("%H:%M:%S")  # ใช้เช็กช่วงเวลา
        base = t.strftime("%H:%M")    # ใช้แสดงผล (ไม่เอาวินาที)
        period = ""
        if raw == "11:59:59":
            period = "ช่วงเช้า"
        elif raw == "16:29:59":
            period = "ช่วงบ่าย"
        elif raw == "00:00:00":
            period = "ไม่ระบุเวลา"
        return f"{period}"

    # =================== 1) กล่องบน ===================
    top_box_rows = 6  # เดิม 5 เพิ่มแถว Messenger
    top_box_height = top_box_rows * row_height

    c.rect(left, top - top_box_height, table_width, top_box_height)
    c.line(left + label_col_width, top, left + label_col_width, top - top_box_height)
    for i in range(1, top_box_rows):
        y = top - i * row_height
        c.line(left, y, right, y)

    labels_top = ["บริษัท", "วันที่", "เวลา", "ชื่อผู้แจ้ง", "ประเภท", "Messenger"]
    values_top = [
        company.name or "",
        booking.booking_date.strftime("%d/%m/%Y") if booking.booking_date else "",
        format_booking_time(booking.booking_time),
        booking.requester_name or "",
        booking.job_type or "",
        booking.messenger_name or "",
    ]

    y = top - row_height + 7
    for label, value in zip(labels_top, values_top):
        c.drawString(left + 5, y, label)
        display_value = shorten_to_width(value, value_max_width)
        c.drawString(left + label_col_width + 8, y, display_value)
        y -= row_height

    # =================== 2) กล่องกลาง: รายละเอียด ===================
    detail_top = top - top_box_height - 40

    first_row_height = row_height
    body_height = 230
    detail_height = first_row_height + body_height

    c.rect(left, detail_top - detail_height, table_width, detail_height)
    c.line(
        left + label_col_width,
        detail_top,
        left + label_col_width,
        detail_top - detail_height,
    )

    label_y = detail_top - first_row_height + 7
    c.drawString(left + 5, label_y, "รายละเอียด")

    detail_text = booking.detail or ""
    wrapped_lines = wrap_text(detail_text)

    text_obj = c.beginText()
    text_obj.setFont(font_name, font_size)
    text_obj.setTextOrigin(left + label_col_width + 8, label_y)

    max_body_bottom = detail_top - detail_height + 10
    for line in wrapped_lines:
        if text_obj.getY() < max_body_bottom:
            break
        text_obj.textLine(line)

    c.drawText(text_obj)

    # =================== 3) กล่องล่าง ===================
    bottom_top = detail_top - detail_height - 40
    bottom_rows = 5
    bottom_height = bottom_rows * row_height

    c.rect(left, bottom_top - bottom_height, table_width, bottom_height)
    c.line(
        left + label_col_width,
        bottom_top,
        left + label_col_width,
        bottom_top - bottom_height,
    )
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

        if label == "หน่วยงาน":
            lines = wrap_text(value)[:2]  # จำกัด 2 บรรทัด
            text = c.beginText()
            text.setFont(font_name, font_size)
            text.setTextOrigin(left + label_col_width + 8, y)
            for ln in lines:
                text.textLine(ln)
            c.drawText(text)
        else:
            display_value = shorten_to_width(value, value_max_width)
            c.drawString(left + label_col_width + 8, y, display_value)

        y -= row_height

    # =================== 4) ส่วนลายเซ็น ===================
    sign_y = bottom_top - bottom_height - 50

    c.drawString(70, sign_y + 25, "ผู้รับ ________________________________")
    c.drawString(100, sign_y, "วันที่ _____ / _____ / ________")

    c.drawString(350, sign_y + 25, "ผู้ส่ง ________________________________")
    c.drawString(380, sign_y, "วันที่ _____ / _____ / ________")

    c.showPage()
    c.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"booking_{booking_id}.pdf",
        mimetype="application/pdf",
    )