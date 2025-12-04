from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

    full_name = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))

    role = db.Column(db.String(20), nullable=False, default="USER")  # ADMIN, USER
    is_approver = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # bookings ที่ user สร้างเอง
    bookings = db.relationship(
        "Booking",
        backref="creator",
        foreign_keys="Booking.created_by",
        lazy="dynamic",
    )

    # bookings ที่ user เป็นคนอนุมัติ (ถ้าใช้ workflow อนุมัติ)
    approvals = db.relationship(
        "Booking",
        backref="approver",
        foreign_keys="Booking.approved_by",
        lazy="dynamic",
    )

    # ---------------- password helper ---------------- #

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    # ---------------- serialize ---------------- #

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "is_approver": self.is_approver,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    bookings = db.relationship("Booking", backref="company", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<Company {self.name}>"


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    booking_date = db.Column(db.Date, nullable=False)
    booking_time = db.Column(db.Time, nullable=False)

    requester_name = db.Column(db.String(255), nullable=False)
    job_type = db.Column(db.String(100), nullable=False)
    detail = db.Column(db.Text, nullable=False)

    department = db.Column(db.String(255), nullable=False)
    building = db.Column(db.String(255), nullable=False)
    floor = db.Column(db.String(50), nullable=False)

    contact_name = db.Column(db.String(255), nullable=False)
    contact_phone = db.Column(db.String(50), nullable=False)

    # สถานะที่ใช้งานจริงตอนนี้: PENDING, SUCCESS, CANCEL
    status = db.Column(db.String(20), nullable=False, default="PENDING")

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    # 🔹 ชื่อ Messenger (เก็บเป็น text ตรง ๆ)
    messenger_name = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        """
        ใช้ได้ทั้งฝั่ง user (/bookings/my) และฝั่ง admin (/admin/report)
        - มี company เป็น object เต็ม
        - มี company_name แยกให้ใช้สะดวกใน Report/Excel/PDF
        """
        return {
            "id": self.id,
            "company": self.company.to_dict() if self.company else None,
            "company_name": self.company.name if self.company else None,
            "company_id": self.company_id,
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "booking_time": self.booking_time.strftime("%H:%M")
            if self.booking_time
            else None,
            "requester_name": self.requester_name,
            "job_type": self.job_type,
            "detail": self.detail,
            "department": self.department,
            "building": self.building,
            "floor": self.floor,
            "contact_name": self.contact_name,
            "contact_phone": self.contact_phone,
            "status": self.status,
            "created_by": self.created_by,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            # 🔹 ส่งชื่อ messenger ออกไปให้ frontend ใช้
            "messenger_name": self.messenger_name,
        }

    def __repr__(self):
        return f"<Booking #{self.id} {self.booking_date} {self.booking_time}>"