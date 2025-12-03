from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from io import BytesIO
import datetime as dt
import os

import pandas as pd
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas  # ยังใช้ได้ แต่ในเวอร์ชันใหม่เราจะใช้ SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from models import db, User, Booking, Company

admin_bp = Blueprint("admin", __name__)

# ----------------------------- Thai Font Register ----------------------------- #

# โฟลเดอร์ backend เป็นโฟลเดอร์แม่ของ routes/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(BASE_DIR, "fonts")
THAI_FONT_PATH = os.path.join(FONT_DIR, "THSarabunNew.ttf")

# ลงฟอนต์ THSarabunNew.ttf ไว้ที่ backend/fonts ก่อน
try:
    pdfmetrics.registerFont(TTFont("THSarabun", THAI_FONT_PATH))
    print(f">>> Registered Thai font from {THAI_FONT_PATH}")
except Exception as e:
    print(">>> WARNING: Cannot register Thai font:", e)


# ----------------------------- Admin Only Decorator ----------------------------- #

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()  # ตอนนี้เป็น string เช่น "1"

        # แปลงให้เป็น int
        try:
            user_id = int(identity)
        except (TypeError, ValueError):
            return jsonify({"message": "invalid token identity"}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "user not found"}), 404

        if user.role != "ADMIN":
            return jsonify({"message": "admin only"}), 403

        return fn(*args, **kwargs)
    return wrapper


# ----------------------------- Query Builder ----------------------------- #

def build_query_from_filters():
    q = (
        db.session.query(Booking, Company)
        .join(Company, Booking.company_id == Company.id)
    )

    # filters
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status = request.args.get("status")
    company_id = request.args.get("company_id")

    if start_date:
        try:
            d = dt.date.fromisoformat(start_date)
            q = q.filter(Booking.booking_date >= d)
        except Exception:
            pass

    if end_date:
        try:
            d = dt.date.fromisoformat(end_date)
            q = q.filter(Booking.booking_date <= d)
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
    results = []
    for booking, company in rows:
        d = booking.to_dict()
        d["company_name"] = company.name
        results.append(d)
    return results


# ----------------------------- 1) API: ดึง bookings ทั้งหมด ----------------------------- #

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

    return jsonify(to_dict_list(rows))


# ----------------------------- 2) API: Report JSON ----------------------------- #

@admin_bp.route("/report", methods=["GET"])
@jwt_required()
@admin_required
def report():
    rows = build_query_from_filters()
    return jsonify(to_dict_list(rows))


# ----------------------------- 3) API: Export Excel ----------------------------- #

@admin_bp.route("/report/excel", methods=["GET"])
@jwt_required()
@admin_required
def report_excel():
    rows = build_query_from_filters()
    data = to_dict_list(rows)

    # ⭐ ลบ company_id (ถ้าไม่ต้องการใน Excel)
    for d in data:
        d.pop("company_id", None)   # ป้องกันคอลัมน์เก่าโผล่ใน Excel

    # ⭐ สร้าง DataFrame ที่ใช้ company_name แทน company_id
    df = pd.DataFrame(data, columns=[
        "booking_date",
        "booking_time",
        "company_name",     # ใช้ชื่อบริษัทล้วน
        "requester_name",
        "job_type",
        "department",
        "detail",
        "contact_name",
        "contact_phone",
        "status"
    ])

    output = BytesIO()
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)

    return send_file(
        output,
        download_name="messenger_report.xlsx",
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ----------------------------- 4) API: Export PDF (Landscape + Thai Font) ----------------------------- #

@admin_bp.route("/report/pdf", methods=["GET"])
@jwt_required()
@admin_required
def report_pdf():
    rows = build_query_from_filters()
    data = to_dict_list(rows)

    buffer = BytesIO()

    # ใช้ A4 แนวนอน
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TitleThai",
        parent=styles["Title"],
        fontName="THSarabun",
        fontSize=20,
        leading=24,
        alignment=1,  # center
    )

    header_style = ParagraphStyle(
        "HeaderThai",
        parent=styles["Normal"],
        fontName="THSarabun",
        fontSize=14,
        leading=16,
        alignment=1,  # center
    )

    cell_style = ParagraphStyle(
        "CellThai",
        parent=styles["Normal"],
        fontName="THSarabun",
        fontSize=12,
        leading=14,
        wordWrap="CJK",  # ช่วยตัดคำไทย/ยาวๆ
    )

    # ---------------- สร้างหัวตาราง ----------------
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
    ]

    table_data = [[Paragraph(h, header_style) for h in headers]]

    # ---------------- สร้างแถวข้อมูล ----------------
    for b in data:
        status_th = b.get("status", "")
        if status_th == "SUCCESS":
            status_th = "สำเร็จ"
        elif status_th == "PENDING":
            status_th = "รอดำเนินการ"
        elif status_th == "CANCEL":
            status_th = "ยกเลิก"

        row = [
            Paragraph(b.get("booking_date", ""), cell_style),
            Paragraph(b.get("booking_time", ""), cell_style),
            Paragraph(b.get("company_name", ""), cell_style),
            Paragraph(b.get("job_type", ""), cell_style),
            Paragraph(b.get("requester_name", ""), cell_style),
            Paragraph(b.get("department", ""), cell_style),
            Paragraph(b.get("detail", ""), cell_style),
            Paragraph(b.get("contact_name", ""), cell_style),
            Paragraph(b.get("contact_phone", ""), cell_style),
            Paragraph(status_th, cell_style),
        ]
        table_data.append(row)

    # ---------------- สร้าง Table ----------------
    table = Table(
        table_data,
        repeatRows=1,  # ให้ header ซ้ำทุกหน้า
        # สามารถกำหนด colWidths ได้ ถ้าอยาก fix ความกว้างแต่ละคอลัมน์
        # colWidths=[60, 40, 100, 80, 80, 80, 180, 80, 80, 60]
    )

    table.setStyle(
        TableStyle(
            [
                # เส้นตาราง
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),

                # พื้นหลังหัวตาราง
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),

                # จัดกลางหัวตาราง
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),

                # จัดบน-ซ้ายสำหรับ detail เพื่อให้อ่านง่าย
                ("VALIGN", (0, 0), (-1, -1), "TOP"),

                # padding
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    elements = []
    elements.append(Paragraph("รายงานการจอง Messenger", title_style))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        download_name="messenger_report.pdf",
        as_attachment=True,
        mimetype="application/pdf",
    )