from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import qrcode
import io
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-this')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = 24  # hours

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password: str
    name: str
    role: str = "user"  # user or admin
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str

class Bus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bus_number: str
    route_from: str
    route_to: str
    departure_time: str
    arrival_time: str
    total_seats: int
    available_seats: int
    price: float
    amenities: List[str] = []
    bus_type: str = "Seater"  # Seater, Sleeper, AC, Non-AC
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BusCreate(BaseModel):
    bus_number: str
    route_from: str
    route_to: str
    departure_time: str
    arrival_time: str
    total_seats: int
    price: float
    amenities: List[str] = []
    bus_type: str = "Seater"

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    bus_id: str
    seats: List[int]
    total_amount: float
    booking_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"  # pending, confirmed, cancelled
    payment_status: str = "pending"  # pending, completed, failed
    session_id: Optional[str] = None
    passenger_name: str
    passenger_email: str
    passenger_phone: str

class BookingCreate(BaseModel):
    bus_id: str
    seats: List[int]
    passenger_name: str
    passenger_email: str
    passenger_phone: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    amount: float
    currency: str = "usd"
    session_id: str
    payment_status: str = "pending"
    status: str = "pending"
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        name=user_data.name,
        role="user"
    )
    
    await db.users.insert_one(user.model_dump())
    token = create_token(user.id, user.email, user.role)
    
    return {
        "token": token,
        "user": UserResponse(**user.model_dump())
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ==================== BUS ROUTES ====================

@api_router.get("/buses/search")
async def search_buses(route_from: str = None, route_to: str = None, date: str = None):
    query = {}
    if route_from:
        query["route_from"] = {"$regex": route_from, "$options": "i"}
    if route_to:
        query["route_to"] = {"$regex": route_to, "$options": "i"}
    
    buses = await db.buses.find(query, {"_id": 0}).to_list(1000)
    return buses

@api_router.get("/buses/{bus_id}")
async def get_bus(bus_id: str):
    bus = await db.buses.find_one({"id": bus_id}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    bus = await db.buses.find_one({"id": booking_data.bus_id}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    if bus['available_seats'] < len(booking_data.seats):
        raise HTTPException(status_code=400, detail="Not enough seats available")
    
    total_amount = bus['price'] * len(booking_data.seats)
    
    booking = Booking(
        user_id=current_user['id'],
        bus_id=booking_data.bus_id,
        seats=booking_data.seats,
        total_amount=total_amount,
        passenger_name=booking_data.passenger_name,
        passenger_email=booking_data.passenger_email,
        passenger_phone=booking_data.passenger_phone
    )
    
    await db.bookings.insert_one(booking.model_dump())
    return booking.model_dump()

@api_router.get("/bookings")
async def get_user_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Enrich with bus details
    for booking in bookings:
        bus = await db.buses.find_one({"id": booking['bus_id']}, {"_id": 0})
        booking['bus_details'] = bus
    
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "user_id": current_user['id']}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    bus = await db.buses.find_one({"id": booking['bus_id']}, {"_id": 0})
    booking['bus_details'] = bus
    return booking

@api_router.get("/bookings/{booking_id}/download")
async def download_ticket(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "user_id": current_user['id']}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['payment_status'] != 'completed':
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    bus = await db.buses.find_one({"id": booking['bus_id']}, {"_id": 0})
    
    # Generate PDF with QR code
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"BOOKING:{booking_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    # Draw ticket
    p.setFont("Helvetica-Bold", 24)
    p.drawString(200, height - 100, "Bus Ticket")
    
    p.setFont("Helvetica", 12)
    y_position = height - 150
    
    details = [
        f"Booking ID: {booking_id}",
        f"Passenger: {booking['passenger_name']}",
        f"Email: {booking['passenger_email']}",
        f"Phone: {booking['passenger_phone']}",
        "",
        f"Bus Number: {bus['bus_number']}",
        f"Route: {bus['route_from']} to {bus['route_to']}",
        f"Departure: {bus['departure_time']}",
        f"Arrival: {bus['arrival_time']}",
        f"Seats: {', '.join(map(str, booking['seats']))}",
        f"Total Amount: ${booking['total_amount']:.2f}",
        "",
        f"Booking Date: {booking['booking_date'][:10]}",
        f"Status: {booking['status'].upper()}"
    ]
    
    for detail in details:
        p.drawString(100, y_position, detail)
        y_position -= 25
    
    # Add QR code
    qr_image = ImageReader(qr_buffer)
    p.drawImage(qr_image, width - 200, height - 300, width=150, height=150)
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=ticket_{booking_id}.pdf"
    })

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/create-session")
async def create_payment_session(data: dict, current_user: dict = Depends(get_current_user)):
    booking_id = data.get('booking_id')
    host_url = data.get('host_url')
    
    booking = await db.bookings.find_one({"id": booking_id, "user_id": current_user['id']}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['payment_status'] == 'completed':
        raise HTTPException(status_code=400, detail="Booking already paid")
    
    # Initialize Stripe
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payment-cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking['total_amount']),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "user_id": current_user['id']
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    transaction = PaymentTransaction(
        booking_id=booking_id,
        user_id=current_user['id'],
        amount=float(booking['total_amount']),
        session_id=session.session_id,
        metadata={
            "booking_id": booking_id,
            "user_id": current_user['id']
        }
    )
    
    await db.payment_transactions.insert_one(transaction.model_dump())
    await db.bookings.update_one({"id": booking_id}, {"$set": {"session_id": session.session_id}})
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update if payment completed and not already processed
    if checkout_status.payment_status == "paid" and transaction['payment_status'] != "completed":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "completed", "status": "completed"}}
        )
        
        booking = await db.bookings.find_one({"id": transaction['booking_id']}, {"_id": 0})
        if booking:
            # Update booking
            await db.bookings.update_one(
                {"id": transaction['booking_id']},
                {"$set": {"payment_status": "completed", "status": "confirmed"}}
            )
            
            # Update bus available seats
            await db.buses.update_one(
                {"id": booking['bus_id']},
                {"$inc": {"available_seats": -len(booking['seats'])}}
            )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id, "payment_status": {"$ne": "completed"}},
                {"_id": 0}
            )
            
            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "completed", "status": "completed"}}
                )
                
                booking = await db.bookings.find_one({"id": transaction['booking_id']}, {"_id": 0})
                if booking:
                    await db.bookings.update_one(
                        {"id": transaction['booking_id']},
                        {"$set": {"payment_status": "completed", "status": "confirmed"}}
                    )
                    
                    await db.buses.update_one(
                        {"id": booking['bus_id']},
                        {"$inc": {"available_seats": -len(booking['seats'])}}
                    )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ADMIN ROUTES ====================

@api_router.post("/admin/buses")
async def create_bus(bus_data: BusCreate, admin: dict = Depends(get_admin_user)):
    bus = Bus(**bus_data.model_dump(), available_seats=bus_data.total_seats)
    await db.buses.insert_one(bus.model_dump())
    return bus.model_dump()

@api_router.put("/admin/buses/{bus_id}")
async def update_bus(bus_id: str, bus_data: BusCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.buses.find_one({"id": bus_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    await db.buses.update_one(
        {"id": bus_id},
        {"$set": bus_data.model_dump()}
    )
    return {"message": "Bus updated successfully"}

@api_router.delete("/admin/buses/{bus_id}")
async def delete_bus(bus_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.buses.delete_one({"id": bus_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bus not found")
    return {"message": "Bus deleted successfully"}

@api_router.get("/admin/buses")
async def get_all_buses(admin: dict = Depends(get_admin_user)):
    buses = await db.buses.find({}, {"_id": 0}).to_list(1000)
    return buses

@api_router.get("/admin/bookings")
async def get_all_bookings(admin: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        bus = await db.buses.find_one({"id": booking['bus_id']}, {"_id": 0})
        user = await db.users.find_one({"id": booking['user_id']}, {"_id": 0, "password": 0})
        booking['bus_details'] = bus
        booking['user_details'] = user
    
    return bookings

@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(get_admin_user)):
    total_buses = await db.buses.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    total_users = await db.users.count_documents({"role": "user"})
    
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    
    # Revenue calculation
    all_bookings = await db.bookings.find({"payment_status": "completed"}, {"_id": 0}).to_list(1000)
    total_revenue = sum([b.get('total_amount', 0) for b in all_bookings])
    
    # Recent bookings
    recent_bookings = await db.bookings.find({}, {"_id": 0}).sort("booking_date", -1).limit(10).to_list(10)
    for booking in recent_bookings:
        bus = await db.buses.find_one({"id": booking['bus_id']}, {"_id": 0})
        booking['bus_details'] = bus
    
    return {
        "total_buses": total_buses,
        "total_bookings": total_bookings,
        "total_users": total_users,
        "confirmed_bookings": confirmed_bookings,
        "pending_bookings": pending_bookings,
        "total_revenue": total_revenue,
        "recent_bookings": recent_bookings
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()