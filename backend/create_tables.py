# create_tables.py
from app import create_app
from models import db, User, Company

app = create_app()

with app.app_context():
    # สร้างตารางทั้งหมดตาม models.py
    db.create_all()
    print(">>> All tables created successfully in PostgreSQL!")

    # ---------- seed default admin ---------- #
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

    # ---------- seed example companies ---------- #
    if Company.query.count() == 0:
        db.session.add_all(
            [
                Company(name="บริษัทตัวอย่าง A"),
                Company(name="บริษัทตัวอย่าง B"),
            ]
        )
        print(" - seeded companies")

    db.session.commit()
    print(">>> Database initialized.")