from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
import aiosqlite
from database import get_db, DB_PATH
from auth_utils import hash_password, verify_password, create_access_token
import re

router = APIRouter()


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    industry: str
    linkedin: str = ""
    phone: str = ""
    contactEmail: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateRequest(BaseModel):
    userId: str
    name: str | None = None
    industry: str | None = None
    linkedin: str | None = None
    phone: str | None = None
    contactEmail: str | None = None
    role: str | None = None


def _validate_email(email: str):
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=422, detail="Invalid email address")


def _validate_password(password: str):
    if len(password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")


def _row_to_user(row) -> dict:
    return {
        "userId": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "industry": row["industry"],
        "linkedin": row["linkedin"] or "",
        "phone": row["phone"] or "",
        "contactEmail": row["contact_email"] or row["email"],
    }


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest):
    _validate_email(body.email)
    _validate_password(body.password)

    if not body.name.strip() or not body.industry.strip():
        raise HTTPException(status_code=422, detail="Name and industry are required")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        existing = await db.execute("SELECT id FROM users WHERE email = ?", (body.email.lower(),))
        if await existing.fetchone():
            raise HTTPException(status_code=409, detail="Email already in use")

        count_row = await db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'exporter'")
        count = (await count_row.fetchone())["c"]
        user_id = f"EXP_{(count + 2000):04d}"

        pw_hash = hash_password(body.password)
        contact_email = body.contactEmail or body.email

        await db.execute(
            """INSERT INTO users (user_id, name, email, password_hash, role, industry, linkedin, phone, contact_email)
               VALUES (?, ?, ?, ?, 'exporter', ?, ?, ?, ?)""",
            (user_id, body.name.strip(), body.email.lower(), pw_hash,
             body.industry, body.linkedin, body.phone, contact_email),
        )
        await db.commit()

    token = create_access_token(user_id)
    return {
        "message": "Account created successfully",
        "token": token,
        "user": {
            "userId": user_id, "name": body.name.strip(), "email": body.email.lower(),
            "role": "exporter", "industry": body.industry,
            "linkedin": body.linkedin, "phone": body.phone,
            "contactEmail": contact_email,
        },
    }


@router.post("/login")
async def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=422, detail="Email and password are required")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        row = await db.execute("SELECT * FROM users WHERE email = ?", (body.email.lower(),))
        user = await row.fetchone()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["user_id"])
    return {"message": "Login successful", "token": token, "user": _row_to_user(user)}


@router.get("/me/{user_id}")
async def get_me(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        row = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        user = await row.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _row_to_user(user)


@router.put("/update")
async def update_profile(body: UpdateRequest):
    fields, values = [], []
    for field, col in [("name", "name"), ("industry", "industry"), ("linkedin", "linkedin"),
                       ("phone", "phone"), ("contactEmail", "contact_email"), ("role", "role")]:
        val = getattr(body, field)
        if val is not None:
            fields.append(f"{col} = ?")
            values.append(val)

    if not fields:
        raise HTTPException(status_code=422, detail="No fields to update")

    values.append(body.userId)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?", values)
        await db.commit()
        row = await db.execute("SELECT * FROM users WHERE user_id = ?", (body.userId,))
        user = await row.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Profile updated successfully", "user": _row_to_user(user)}
