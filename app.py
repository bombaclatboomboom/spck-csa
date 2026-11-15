"""
====================================================================
EstateVision - AI-Powered Global Real Estate Intelligence Platform
Production-Ready Flask Backend Application
File: app.py
====================================================================
"""

import os
import sys
import math
import sqlite3
import logging
from datetime import datetime, timedelta
import json
import random
import uuid
from functools import wraps
import jinja2

import numpy as np
import pandas as pd
import joblib
from flask import (
    Flask,
    render_template,
    render_template_string,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    flash,
    g
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# -----------------------------------------------------------------------------
# LOGGING CONFIGURATION
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [%(name)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("EstateVision")

# -----------------------------------------------------------------------------
# APP CONFIGURATION & PATH SETUP
# -----------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'cleaned_real_estate.csv')
MODEL_FILE = os.path.join(BASE_DIR, 'real_estate_model.pkl')
DATABASE_PATH = os.path.join(BASE_DIR, 'users.db')

# Global Historical Property Price Index Data (BIS / Central Bank Sources)
GLOBAL_DATA_DIR = os.path.join(BASE_DIR, 'static', 'data')
GLOBAL_REAL_YEAR = os.path.join(GLOBAL_DATA_DIR, 'real_year.csv')
GLOBAL_NOMINAL_YEAR = os.path.join(GLOBAL_DATA_DIR, 'nominal_year.csv')
GLOBAL_NOMINAL_INDEX = os.path.join(GLOBAL_DATA_DIR, 'nominal_index.csv')
GLOBAL_REAL_INDEX = os.path.join(GLOBAL_DATA_DIR, 'real_index.csv')

# Uploads Folder for Property Images (.jpg files)
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads', 'properties')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'estatevision_luxury_secret_key_prod_2026_d4af37'),
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    JSON_SORT_KEYS=False,
    UPLOAD_FOLDER=UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH=16 * 1024 * 1024
)

# Optional Flask-CORS integration with fallback header injection
try:
    from flask_cors import CORS
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
    logger.info("Flask-CORS initialized successfully.")
except ImportError:
    logger.info("Flask-CORS not installed; using standard after_request CORS headers.")

@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are appended to all responses."""
    origin = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With,Accept'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# -----------------------------------------------------------------------------
# GLOBAL IN-MEMORY CACHE FOR DATASET & ML MODEL
# -----------------------------------------------------------------------------
DF = None
MODEL = None
CACHED_COUNTRIES = None

def load_data():
    """
    Load cleaned_real_estate.csv into memory and cache globally.
    Casts numeric fields and handles NaN entries gracefully.
    """
    global DF, CACHED_COUNTRIES
    if DF is not None:
        return DF

    if not os.path.exists(DATA_FILE):
        logger.error(f"Dataset CSV not found at: {DATA_FILE}")
        DF = pd.DataFrame(columns=[
            'title', 'country', 'city', 'building_construction_year',
            'building_total_floors', 'apartment_floor', 'bedrooms',
            'apartment_bedrooms', 'apartment_bathrooms', 'area',
            'apartment_living_area', 'price', 'image', 'url',
            'latitude', 'longitude'
        ])
        CACHED_COUNTRIES = []
        return DF

    logger.info(f"Loading dataset from: {DATA_FILE}")
    try:
        df = pd.read_csv(DATA_FILE)

        # Standardize and sanitize columns
        if 'price' in df.columns:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
        if 'bedrooms' in df.columns:
            df['bedrooms'] = pd.to_numeric(df['bedrooms'], errors='coerce').fillna(2.0)
        if 'area' in df.columns:
            df['area'] = pd.to_numeric(df['area'], errors='coerce').fillna(75.0)
        if 'latitude' in df.columns:
            df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(0.0)
        if 'longitude' in df.columns:
            df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(0.0)
        if 'building_construction_year' in df.columns:
            df['building_construction_year'] = pd.to_numeric(df['building_construction_year'], errors='coerce')
        if 'country' in df.columns:
            df['country'] = df['country'].fillna('Global').astype(str).str.strip()
        if 'city' in df.columns:
            df['city'] = df['city'].fillna('Urban Area').astype(str).str.strip()

        # Extract sorted unique countries
        unique_countries = sorted([
            c for c in df['country'].unique() 
            if c and c.lower() not in ['nan', 'none', '']
        ])
        CACHED_COUNTRIES = unique_countries
        DF = df
        logger.info(f"Loaded {len(DF):,} real estate records across {len(CACHED_COUNTRIES)} countries.")
        return DF
    except Exception as e:
        logger.error(f"Error loading CSV data: {e}", exc_info=True)
        DF = pd.DataFrame()
        CACHED_COUNTRIES = []
        return DF

def load_ml_model():
    """
    Load real_estate_model.pkl into memory and cache globally.
    """
    global MODEL
    if MODEL is not None:
        return MODEL

    if not os.path.exists(MODEL_FILE):
        logger.warning(f"ML Model file not found at: {MODEL_FILE}")
        return None

    try:
        logger.info(f"Loading ML model from: {MODEL_FILE}")
        MODEL = joblib.load(MODEL_FILE)
        logger.info("ML valuation model loaded successfully.")
        return MODEL
    except Exception as e:
        logger.error(f"Error loading ML model: {e}", exc_info=True)
        return None

def compute_price_color(q):
    """
    Compute smooth hex color from price quantile (0.0 to 1.0)
    using color gradient: emerald green (#10B981) -> luxury gold (#D4AF37) -> crimson red (#EF4444)
    """
    q = max(0.0, min(1.0, float(q)))
    if q <= 0.5:
        t = q / 0.5
        # #10B981 (16, 185, 129) -> #D4AF37 (212, 175, 55)
        r = int(16 + (212 - 16) * t)
        g = int(185 + (175 - 185) * t)
        b = int(129 + (55 - 129) * t)
    else:
        t = (q - 0.5) / 0.5
        # #D4AF37 (212, 175, 55) -> #EF4444 (239, 68, 68)
        r = int(212 + (239 - 212) * t)
        g = int(175 + (68 - 175) * t)
        b = int(55 + (68 - 55) * t)
    return f"#{r:02x}{g:02x}{b:02x}"

# -----------------------------------------------------------------------------
# DATABASE MANAGEMENT (SQLITE)
# -----------------------------------------------------------------------------
def get_db():
    """Get request-scoped SQLite database connection."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    """Close SQLite database connection on teardown."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """
    Create SQLite tables if they do not exist and seed default accounts.
    """
    logger.info(f"Initializing database at {DATABASE_PATH}...")
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('agent', 'customer')),
                company TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS properties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                country TEXT NOT NULL,
                country_code TEXT,
                city TEXT NOT NULL,
                address TEXT,
                property_type TEXT DEFAULT 'Apartment',
                price REAL NOT NULL,
                bedrooms REAL DEFAULT 2,
                bathrooms REAL DEFAULT 2,
                area REAL DEFAULT 120,
                building_year INTEGER,
                total_floors INTEGER,
                floor INTEGER,
                description TEXT,
                features TEXT,
                image_url TEXT,
                gallery_images TEXT,
                seller_id INTEGER,
                seller_name TEXT,
                seller_email TEXT,
                seller_phone TEXT,
                status TEXT DEFAULT 'available',
                is_featured INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id INTEGER,
                buyer_id INTEGER,
                buyer_name TEXT NOT NULL,
                buyer_email TEXT NOT NULL,
                buyer_phone TEXT,
                seller_id INTEGER,
                offer_amount REAL NOT NULL,
                down_payment REAL DEFAULT 0,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'Pending Escrow',
                notes TEXT,
                transaction_code TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Seed demo accounts if empty
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            demo_users = [
                (
                    "alexander@estatevision.io",
                    generate_password_hash("Luxury2026!"),
                    "Alexander Vance",
                    "agent",
                    "Aura Prime Realty",
                    "+1 (555) 019-2834"
                ),
                (
                    "investor@estatevision.io",
                    generate_password_hash("Investor2026!"),
                    "Elena Rostova",
                    "customer",
                    "Vanguard Global Holdings",
                    "+44 20 7946 0912"
                )
            ]
            cursor.executemany(
                """
                INSERT INTO users (email, password_hash, full_name, role, company, phone)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                demo_users
            )
            conn.commit()
            logger.info("Demo user accounts seeded successfully.")
    conn.close()
    logger.info("Database initialized.")

def get_current_user():
    """Fetch current authenticated user dictionary or None."""
    user_id = session.get('user_id')
    if not user_id:
        return None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, email, full_name, role, company, phone, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
    except Exception as e:
        logger.error(f"Error fetching current user: {e}")
    return None

@app.context_processor
def inject_global_template_context():
    """Inject current user and metadata into all rendered templates."""
    current_user_obj = get_current_user()
    return {
        'user': current_user_obj,
        'current_user': current_user_obj,
        'current_year': datetime.now().year,
        'brand_name': 'EstateVision'
    }

# -----------------------------------------------------------------------------
# AUTHENTICATION DECORATOR & SAFE TEMPLATE RENDERER
# -----------------------------------------------------------------------------
def login_required(f):
    """
    Decorator protecting authenticated routes.
    Returns 401 JSON for API calls.
    For web pages, auto-initializes the demo investor account if unauthenticated
    so visitors can explore every feature smoothly without forced login walls.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            if request.path.startswith('/api/') or (request.is_json and not request.path.startswith('/api/auth/')):
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized',
                    'message': 'Authentication required. Please log in.'
                }), 401
            # Auto-assign demo investor credentials for seamless exploration
            session['user_id'] = 2
            session['user_email'] = 'investor@estatevision.io'
            session['user_role'] = 'customer'
            session['user_name'] = 'Elena Rostova'
        return f(*args, **kwargs)
    return decorated_function

def safe_render_template(template_name, **context):
    """
    Safely render a Jinja2 template file.
    If the template file does not yet exist on disk, render a dark luxury placeholder
    extending base.html so the platform remains fully navigable and crash-free.
    """
    try:
        return render_template(template_name, **context)
    except jinja2.exceptions.TemplateNotFound:
        page_title = context.get('active_page', 'Portal').replace('_', ' ').title()
        fallback_html = f"""
        {{% extends "base.html" %}}
        {{% block title %}}{page_title}{{% endblock %}}
        {{% block content %}}
        <div class="container" style="padding: 80px 24px; min-height: 75vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div style="background: rgba(17, 24, 39, 0.8); backdrop-filter: blur(16px); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 20px; padding: 48px; max-width: 620px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                <div style="font-size: 52px; margin-bottom: 20px;">🏛️</div>
                <h1 style="font-family: 'Playfair Display', serif; color: #D4AF37; font-size: 32px; margin-bottom: 14px;">{page_title} Module</h1>
                <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                    The template <code>{template_name}</code> is currently being customized. All backend REST APIs for this view are fully operational.
                </p>
                <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
                    <a href="/dashboard" class="btn" style="padding: 12px 28px; background: #D4AF37; color: #0A0A0F; border-radius: 10px; font-weight: 600; text-decoration: none;">Dashboard</a>
                    <a href="/explore" class="btn" style="padding: 12px 28px; border: 1px solid #D4AF37; color: #D4AF37; border-radius: 10px; text-decoration: none;">3D Globe</a>
                </div>
            </div>
        </div>
        {{% endblock %}}
        """
        return render_template_string(fallback_html, **context)

# -----------------------------------------------------------------------------
# PAGE ROUTES (SERVE HTML TEMPLATES)
# -----------------------------------------------------------------------------
@app.route('/', methods=['GET'])
def page_home():
    """Landing Page (public, no authentication required)."""
    return safe_render_template('index.html', is_public=False, active_page='home')

@app.route('/login', methods=['GET', 'POST'])
def page_login():
    """Login Page (public). Supports both GET view and POST submission."""
    if request.method == 'POST':
        email = (request.form.get('email') or '').strip().lower()
        password = request.form.get('password') or ''
        
        # Check if JSON payload
        if not email and request.is_json:
            data = request.get_json(silent=True) or {}
            email = str(data.get('email', '')).strip().lower()
            password = str(data.get('password', ''))
            
        if not email or not password:
            error_msg = 'Both email and password are required.'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 400
            flash(error_msg, 'danger')
            return safe_render_template('auth/login.html', is_public=True, active_page='login')
            
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, email, password_hash, full_name, role, company, phone FROM users WHERE LOWER(email) = ?", (email,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], password):
            error_msg = 'Invalid email address or password. Try Alexander Vance or Elena Rostova demo accounts.'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 401
            flash(error_msg, 'danger')
            return safe_render_template('auth/login.html', is_public=True, active_page='login')
            
        session.clear()
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_role'] = user['role']
        session['user_name'] = user['full_name']
        
        target = request.args.get('next') or url_for('page_dashboard')
        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'redirect': target,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'role': user['role']
                }
            })
        flash(f"Welcome back, {user['full_name']}!", 'success')
        return redirect(target)
        
    if session.get('user_id') and not session.get('is_demo'):
        return redirect(url_for('page_dashboard'))
    return safe_render_template('auth/login.html', is_public=True, active_page='login')

@app.route('/signup', methods=['GET', 'POST'])
def page_signup():
    """Signup Page (public). Supports both GET view and POST submission."""
    if request.method == 'POST':
        data = request.form if request.form else (request.get_json(silent=True) or {})
        email = str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))
        full_name = str(data.get('full_name', '')).strip()
        role = str(data.get('role', 'customer')).strip().lower()
        company = str(data.get('company', '')).strip()
        phone = str(data.get('phone', '')).strip()
        
        if not email or '@' not in email:
            error_msg = 'A valid email address is required.'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 400
            flash(error_msg, 'danger')
            return safe_render_template('auth/signup.html', is_public=True, active_page='signup')
            
        if not password or len(password) < 6:
            error_msg = 'Password must be at least 6 characters.'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 400
            flash(error_msg, 'danger')
            return safe_render_template('auth/signup.html', is_public=True, active_page='signup')
            
        if not full_name:
            full_name = email.split('@')[0].capitalize()
            
        if role not in ['agent', 'customer']:
            role = 'customer'
            
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
        if cursor.fetchone():
            error_msg = 'An account with this email address already exists. Please sign in.'
            if request.is_json:
                return jsonify({'success': False, 'error': error_msg}), 409
            flash(error_msg, 'warning')
            return redirect(url_for('page_login'))
            
        password_hash = generate_password_hash(password)
        cursor.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, company, phone)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (email, password_hash, full_name, role, company, phone)
        )
        db.commit()
        user_id = cursor.lastrowid
        
        session.clear()
        session['user_id'] = user_id
        session['user_email'] = email
        session['user_role'] = role
        session['user_name'] = full_name
        
        target = url_for('page_dashboard')
        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'redirect': target,
                'user': {'id': user_id, 'email': email, 'full_name': full_name, 'role': role}
            }), 201
            
        flash(f"Welcome to EstateVision, {full_name}! Your luxury portal is initialized.", 'success')
        return redirect(target)
        
    if session.get('user_id') and not session.get('is_demo'):
        return redirect(url_for('page_dashboard'))
    return safe_render_template('auth/signup.html', is_public=True, active_page='signup')

@app.route('/demo-login/<role>', methods=['GET'])
def page_demo_login(role):
    """1-Click Instant Demo Login shortcut."""
    session.clear()
    if role.lower() == 'agent':
        session['user_id'] = 1
        session['user_email'] = 'alexander@estatevision.io'
        session['user_role'] = 'agent'
        session['user_name'] = 'Alexander Vance'
        flash('Switched account: Lord Alexander Vance (Prime Real Estate Broker)', 'success')
    else:
        session['user_id'] = 2
        session['user_email'] = 'investor@estatevision.io'
        session['user_role'] = 'customer'
        session['user_name'] = 'Elena Rostova'
        flash('Switched account: Elena Rostova (Institutional Real Estate Investor)', 'success')
    return redirect(request.args.get('next') or url_for('page_dashboard'))

@app.route('/buy', methods=['GET'])
def page_buy():
    """Property Marketplace: Search, filter, and purchase verified global properties."""
    db = get_db()
    cursor = db.cursor()
    
    country = request.args.get('country', '').strip()
    city = request.args.get('city', '').strip()
    prop_type = request.args.get('type', '').strip()
    search = request.args.get('search', '').strip()
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    min_beds = request.args.get('bedrooms', type=float)
    sort_by = request.args.get('sort_by', 'featured')
    page = max(1, request.args.get('page', 1, type=int))
    per_page = 15
    
    query = "SELECT * FROM properties WHERE 1=1"
    params = []
    
    if country and country.lower() not in ['all', 'world', 'global', '']:
        query += " AND LOWER(country) = ?"
        params.append(country.lower())
    if city:
        query += " AND LOWER(city) LIKE ?"
        params.append(f"%{city.lower()}%")
    if prop_type and prop_type.lower() not in ['all', '']:
        query += " AND LOWER(property_type) = ?"
        params.append(prop_type.lower())
    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ? OR LOWER(description) LIKE ?)"
        wild = f"%{search.lower()}%"
        params.extend([wild, wild, wild, wild])
    if min_price is not None:
        query += " AND price >= ?"
        params.append(min_price)
    if max_price is not None:
        query += " AND price <= ?"
        params.append(max_price)
    if min_beds is not None:
        query += " AND bedrooms >= ?"
        params.append(min_beds)
        
    count_query = query.replace("SELECT *", "SELECT COUNT(*)", 1)
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]
    total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
    
    if sort_by == 'price_asc':
        query += " ORDER BY price ASC"
    elif sort_by == 'price_desc':
        query += " ORDER BY price DESC"
    elif sort_by == 'beds_desc':
        query += " ORDER BY bedrooms DESC"
    elif sort_by == 'area_desc':
        query += " ORDER BY area DESC"
    elif sort_by == 'newest':
        query += " ORDER BY id DESC"
    else:
        query += " ORDER BY is_featured DESC, id ASC"
        
    offset = (page - 1) * per_page
    query += " LIMIT ? OFFSET ?"
    params.extend([per_page, offset])
    
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    
    for r in rows:
        try:
            r['features'] = json.loads(r['features']) if r['features'] else []
        except:
            r['features'] = []
        try:
            r['gallery_images'] = json.loads(r['gallery_images']) if r['gallery_images'] else [r['image_url']]
        except:
            r['gallery_images'] = [r['image_url']]
            
    cursor.execute("SELECT DISTINCT country FROM properties WHERE country IS NOT NULL ORDER BY country ASC")
    all_countries = [r[0] for r in cursor.fetchall() if r[0]]
    cursor.execute("SELECT DISTINCT property_type FROM properties WHERE property_type IS NOT NULL ORDER BY property_type ASC")
    all_types = [r[0] for r in cursor.fetchall() if r[0]]
    
    return safe_render_template(
        'buy.html',
        active_page='buy',
        properties=rows,
        total_count=total_count,
        current_page=page,
        total_pages=total_pages,
        available_countries=all_countries,
        available_types=all_types,
        filters={
            'country': country,
            'city': city,
            'type': prop_type,
            'search': search,
            'min_price': min_price or '',
            'max_price': max_price or '',
            'bedrooms': min_beds or '',
            'sort_by': sort_by
        }
    )

@app.route('/sell', methods=['GET', 'POST'])
def page_sell():
    """List a property for sale with drag-and-drop JPG image import slots."""
    if request.method == 'POST':
        try:
            db = get_db()
            cursor = db.cursor()
            
            title = request.form.get('title', '').strip()
            country = request.form.get('country', '').strip()
            city = request.form.get('city', '').strip()
            address = request.form.get('address', '').strip()
            property_type = request.form.get('property_type', 'Apartment').strip()
            price = float(request.form.get('price', 0))
            bedrooms = float(request.form.get('bedrooms', 2.0))
            bathrooms = float(request.form.get('bathrooms', 2.0))
            area = float(request.form.get('area', 100.0))
            building_year = int(request.form.get('building_year', 2022)) if request.form.get('building_year') else 2022
            total_floors = int(request.form.get('total_floors', 5)) if request.form.get('total_floors') else 5
            floor = int(request.form.get('floor', 2)) if request.form.get('floor') else 2
            description = request.form.get('description', '').strip()
            
            features_list = request.form.getlist('features')
            if not features_list:
                custom_feat = request.form.get('custom_features', '').strip()
                features_list = [f.strip() for f in custom_feat.split(',') if f.strip()] if custom_feat else ['Air Conditioning', 'Elevator', 'Security System']
            
            current_u = get_current_user()
            seller_id = current_u['id'] if current_u else 1
            seller_name = request.form.get('seller_name', current_u['full_name'] if current_u else 'Alexander Vance').strip()
            seller_email = request.form.get('seller_email', current_u['email'] if current_u else 'alexander@estatevision.io').strip()
            seller_phone = request.form.get('seller_phone', current_u['phone'] if current_u else '+1 (555) 019-2834').strip()
            
            # Process uploaded .jpg files
            uploaded_images = []
            files = request.files.getlist('images')
            for f in files:
                if f and f.filename:
                    filename = secure_filename(f.filename)
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                        new_name = f"prop_{uuid.uuid4().hex[:10]}{ext}"
                        save_path = os.path.join(app.config['UPLOAD_FOLDER'], new_name)
                        f.save(save_path)
                        uploaded_images.append(f"/static/uploads/properties/{new_name}")
            
            default_photo = request.form.get('sample_preset_image') or 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
            main_image = uploaded_images[0] if uploaded_images else default_photo
            gallery = uploaded_images if uploaded_images else [default_photo]
            
            cursor.execute('''
                INSERT INTO properties (
                    title, country, country_code, city, address, property_type, price,
                    bedrooms, bathrooms, area, building_year, total_floors, floor,
                    description, features, image_url, gallery_images, seller_id,
                    seller_name, seller_email, seller_phone, status, is_featured
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                title, country, country[:2].upper() if country else 'GL', city, address, property_type, price,
                bedrooms, bathrooms, area, building_year, total_floors, floor,
                description, json.dumps(features_list), main_image, json.dumps(gallery),
                seller_id, seller_name, seller_email, seller_phone, 'available', 1
            ))
            db.commit()
            new_id = cursor.lastrowid
            flash(f"Property '{title}' published successfully! It is now live in the global marketplace.", "success")
            return redirect(url_for('page_property_detail', prop_id=new_id))
        except Exception as e:
            logger.error(f"Error listing property: {e}", exc_info=True)
            flash(f"Error publishing listing: {str(e)}", "danger")
            
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT DISTINCT country FROM properties ORDER BY country ASC")
    countries = [r[0] for r in cursor.fetchall() if r[0]]
    current_u = get_current_user()
    return safe_render_template('sell.html', active_page='sell', available_countries=countries, user=current_u)

@app.route('/property/<int:prop_id>', methods=['GET'])
def page_property_detail(prop_id):
    """Dedicated House Details Page with JPG Photo Blanks and Country BIS Macro Trends."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM properties WHERE id = ?", (prop_id,))
    row = cursor.fetchone()
    if not row:
        flash("Property not found.", "warning")
        return redirect(url_for('page_buy'))
        
    prop = dict(row)
    try:
        prop['features'] = json.loads(prop['features']) if prop['features'] else []
    except:
        prop['features'] = []
    try:
        prop['gallery_images'] = json.loads(prop['gallery_images']) if prop['gallery_images'] else [prop['image_url']]
    except:
        prop['gallery_images'] = [prop['image_url']]
        
    # Country BIS Historical Metrics from the 4 CSVs
    country_name = prop.get('country', '')
    country_stats = {'real_yoy': None, 'nominal_yoy': None, 'real_index': None, 'nominal_index': None}
    
    try:
        if os.path.exists(GLOBAL_REAL_YEAR):
            df_ry = pd.read_csv(GLOBAL_REAL_YEAR)
            sub = df_ry[df_ry['country'].str.lower() == country_name.lower()].sort_values('date')
            if not sub.empty:
                country_stats['real_yoy'] = round(float(sub.iloc[-1]['price']), 2)
        if os.path.exists(GLOBAL_NOMINAL_YEAR):
            df_ny = pd.read_csv(GLOBAL_NOMINAL_YEAR)
            sub = df_ny[df_ny['country'].str.lower() == country_name.lower()].sort_values('date')
            if not sub.empty:
                country_stats['nominal_yoy'] = round(float(sub.iloc[-1]['price']), 2)
        if os.path.exists(GLOBAL_REAL_INDEX):
            df_ri = pd.read_csv(GLOBAL_REAL_INDEX)
            sub = df_ri[df_ri['country'].str.lower() == country_name.lower()].sort_values('date')
            if not sub.empty:
                country_stats['real_index'] = round(float(sub.iloc[-1]['price']), 2)
        if os.path.exists(GLOBAL_NOMINAL_INDEX):
            df_ni = pd.read_csv(GLOBAL_NOMINAL_INDEX)
            sub = df_ni[df_ni['country'].str.lower() == country_name.lower()].sort_values('date')
            if not sub.empty:
                country_stats['nominal_index'] = round(float(sub.iloc[-1]['price']), 2)
    except Exception as err:
        logger.warning(f"Error fetching country BIS stats for {country_name}: {err}")
        
    cursor.execute("SELECT * FROM properties WHERE id != ? AND (country = ? OR property_type = ?) LIMIT 3", (prop_id, country_name, prop.get('property_type')))
    similar = [dict(s) for s in cursor.fetchall()]
    for s in similar:
        try:
            s['features'] = json.loads(s['features']) if s['features'] else []
        except:
            s['features'] = []
            
    return safe_render_template(
        'property_detail.html',
        active_page='buy',
        property=prop,
        country_stats=country_stats,
        similar_properties=similar
    )

@app.route('/dashboard', methods=['GET'])
@login_required
def page_dashboard():
    """Main Analytics & Portfolio Dashboard (requires auth)."""
    return safe_render_template('dashboard.html', active_page='dashboard')

@app.route('/explore', methods=['GET'])
@login_required
def page_explore():
    """Interactive 3D Globe Explorer & Property Browser (requires auth)."""
    return safe_render_template('explore.html', active_page='explore')

@app.route('/predict', methods=['GET'])
@login_required
def page_predict():
    """AI Real Estate Valuation & Price Estimator (requires auth)."""
    return safe_render_template('predict.html', active_page='predict')

@app.route('/trends', methods=['GET'])
@login_required
def page_trends():
    """Historical Market Price Trends & Construction Analytics (requires auth)."""
    return safe_render_template('trends.html', active_page='trends')

@app.route('/compare', methods=['GET'])
@login_required
def page_compare():
    """Cross-Country & Cross-City Real Estate Comparison (requires auth)."""
    return safe_render_template('compare.html', active_page='compare')

@app.route('/projects', methods=['GET'])
@login_required
def page_projects():
    """Luxury Developments & Prime Architectural Projects (requires auth)."""
    return safe_render_template('projects.html', active_page='projects')

@app.route('/global', methods=['GET'])
@login_required
def page_global():
    """Global Historical Property Price Trends (1927-2026) from BIS central bank data."""
    return safe_render_template('global.html', active_page='global')

@app.route('/logout', methods=['GET'])
def page_logout():
    """Clear session and redirect to landing page."""
    session.clear()
    return redirect(url_for('page_home'))

# -----------------------------------------------------------------------------
# REST API ENDPOINTS
# -----------------------------------------------------------------------------

@app.route('/api/countries', methods=['GET'])
def api_countries():
    """
    Return sorted list of unique countries from the dataset.
    """
    try:
        df = load_data()
        global CACHED_COUNTRIES
        if CACHED_COUNTRIES is None:
            CACHED_COUNTRIES = sorted([
                c for c in df['country'].unique() 
                if c and str(c).lower() not in ['nan', 'none', '']
            ]) if not df.empty else []

        return jsonify({
            'success': True,
            'countries': CACHED_COUNTRIES,
            'count': len(CACHED_COUNTRIES)
        })
    except Exception as e:
        logger.error(f"Error in api_countries: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/cities', methods=['GET'])
def api_cities():
    """
    Return sorted list of unique cities for a given country or globally.
    """
    try:
        country = request.args.get('country', default='all', type=str).strip()
        df = load_data()
        if df.empty:
            return jsonify({'success': True, 'cities': [], 'count': 0})

        if country.lower() not in ['all', '', 'tất cả (toàn cầu)', 'global']:
            sub_df = df[df['country'].str.lower() == country.lower()]
        else:
            sub_df = df

        cities = sorted([
            str(c) for c in sub_df['city'].dropna().unique() 
            if str(c).strip() and str(c).lower() not in ['nan', 'none']
        ])
        return jsonify({
            'success': True,
            'country': country,
            'cities': cities,
            'count': len(cities)
        })
    except Exception as e:
        logger.error(f"Error in api_cities: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def api_stats():
    """
    Return comprehensive statistics for a specified country or globally:
    - total_properties (count)
    - avg_price (mean)
    - max_price (max)
    - min_price (min)
    - median_price (median)
    - total_cities (unique cities count)
    - price_std (standard deviation)
    """
    try:
        country = request.args.get('country', default='all', type=str).strip()
        df = load_data()

        if df.empty:
            return jsonify({
                'success': True,
                'country': country,
                'total_properties': 0,
                'avg_price': 0.0,
                'max_price': 0.0,
                'min_price': 0.0,
                'median_price': 0.0,
                'total_cities': 0,
                'price_std': 0.0
            })

        if country.lower() in ['all', '', 'tất cả (toàn cầu)', 'global']:
            sub_df = df
        else:
            sub_df = df[df['country'].str.lower() == country.lower()]
            if sub_df.empty:
                return jsonify({
                    'success': True,
                    'country': country,
                    'total_properties': 0,
                    'avg_price': 0.0,
                    'max_price': 0.0,
                    'min_price': 0.0,
                    'median_price': 0.0,
                    'total_cities': 0,
                    'price_std': 0.0
                })

        prices = sub_df['price'].dropna()
        total_props = int(len(sub_df))
        avg_price = round(float(prices.mean()), 2) if not prices.empty else 0.0
        max_price = round(float(prices.max()), 2) if not prices.empty else 0.0
        min_price = round(float(prices.min()), 2) if not prices.empty else 0.0
        median_price = round(float(prices.median()), 2) if not prices.empty else 0.0
        total_cities = int(sub_df['city'].dropna().nunique())
        price_std = round(float(prices.std(ddof=0)), 2) if len(prices) > 1 else 0.0

        return jsonify({
            'success': True,
            'country': country,
            'total_properties': total_props,
            'avg_price': avg_price,
            'max_price': max_price,
            'min_price': min_price,
            'median_price': median_price,
            'total_cities': total_cities,
            'price_std': price_std
        })
    except Exception as e:
        logger.error(f"Error in api_stats: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/properties', methods=['GET'])
def api_properties():
    """
    Return paginated, filtered property listings with all dataset columns.
    Query parameters:
    - country, city
    - min_price, max_price
    - min_beds, max_beds
    - page (default 1), per_page (default 20, max 100)
    - sort_by ('price_desc', 'price_asc', 'beds_desc', 'area_desc')
    """
    try:
        df = load_data()
        if df.empty:
            return jsonify({
                'success': True,
                'page': 1,
                'per_page': 20,
                'total': 0,
                'total_pages': 0,
                'properties': []
            })

        country = request.args.get('country', '').strip()
        city = request.args.get('city', '').strip()
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        min_beds = request.args.get('min_beds', type=float)
        max_beds = request.args.get('max_beds', type=float)
        page = max(1, request.args.get('page', default=1, type=int))
        per_page = max(1, min(100, request.args.get('per_page', default=20, type=int)))
        sort_by = request.args.get('sort_by', default='price_desc', type=str)

        sub_df = df
        if country and country.lower() not in ['all', 'tất cả (toàn cầu)', 'global']:
            sub_df = sub_df[sub_df['country'].str.lower() == country.lower()]

        if city and city.lower() not in ['all', '']:
            sub_df = sub_df[sub_df['city'].str.contains(city, case=False, na=False)]

        if min_price is not None:
            sub_df = sub_df[sub_df['price'] >= min_price]

        if max_price is not None:
            sub_df = sub_df[sub_df['price'] <= max_price]

        if min_beds is not None:
            sub_df = sub_df[sub_df['bedrooms'] >= min_beds]

        if max_beds is not None:
            sub_df = sub_df[sub_df['bedrooms'] <= max_beds]

        # Sorting logic
        if sort_by == 'price_asc':
            sub_df = sub_df.sort_values(by='price', ascending=True)
        elif sort_by == 'price_desc':
            sub_df = sub_df.sort_values(by='price', ascending=False)
        elif sort_by == 'beds_desc':
            sub_df = sub_df.sort_values(by='bedrooms', ascending=False)
        elif sort_by == 'area_desc':
            sub_df = sub_df.sort_values(by='area', ascending=False)

        total = len(sub_df)
        total_pages = math.ceil(total / per_page) if total > 0 else 0

        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        sliced = sub_df.iloc[start_idx:end_idx]

        # Convert NaN values to None for compliant JSON serialization
        records = sliced.replace({np.nan: None}).to_dict(orient='records')

        return jsonify({
            'success': True,
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
            'properties': records
        })
    except Exception as e:
        logger.error(f"Error in api_properties: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/globe-data', methods=['GET'])
def api_globe_data():
    """
    Return sampled geospatial coordinates for 3D globe visualization.
    Each point contains: lat, lng, city, country, price, color (green-gold-red quantile gradient).
    """
    try:
        sample_size = request.args.get('sample_size', default=3000, type=int)
        sample_size = max(10, min(10000, sample_size))
        country = request.args.get('country', default='all', type=str).strip()

        df = load_data()
        if df.empty:
            return jsonify({'success': True, 'count': 0, 'points': []})

        filtered = df.dropna(subset=['latitude', 'longitude', 'price'])
        if country.lower() not in ['all', '', 'tất cả (toàn cầu)', 'global']:
            filtered = filtered[filtered['country'].str.lower() == country.lower()]

        if filtered.empty:
            return jsonify({'success': True, 'count': 0, 'points': []})

        n_samples = min(sample_size, len(filtered))
        sample_df = filtered.sample(n=n_samples, random_state=42).copy()

        # Compute price percentiles (0.0 to 1.0)
        ranks = sample_df['price'].rank(pct=True).values

        points = []
        for (_, row), q in zip(sample_df.iterrows(), ranks):
            points.append({
                'lat': float(row['latitude']),
                'lng': float(row['longitude']),
                'city': str(row['city']),
                'country': str(row['country']),
                'price': float(row['price']),
                'color': compute_price_color(q)
            })

        return jsonify({
            'success': True,
            'count': len(points),
            'points': points
        })
    except Exception as e:
        logger.error(f"Error in api_globe_data: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def api_predict():
    """
    Predict property price using scikit-learn regression model.
    Accepts JSON: { country, bedrooms, area }
    Returns:
    - predicted_price (computed via np.expm1 on log model output)
    - confidence_range ({ low: -15%, high: +15% })
    - comparable_avg (actual country mean from dataset)
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        country = str(data.get('country', '')).strip()
        bedrooms_val = data.get('bedrooms')
        area_val = data.get('area')

        if not country:
            return jsonify({'success': False, 'error': 'Country is required for valuation'}), 400

        try:
            bedrooms = float(bedrooms_val) if bedrooms_val is not None else 2.0
            area = float(area_val) if area_val is not None else 75.0
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid numerical format for bedrooms or area'}), 400

        bedrooms = max(1.0, min(30.0, bedrooms))
        area = max(10.0, min(10000.0, area))

        model = load_ml_model()
        df = load_data()

        # Compute comparable average for the selected country
        country_df = df[df['country'].str.lower() == country.lower()] if not df.empty else pd.DataFrame()
        if not country_df.empty:
            comparable_avg = round(float(country_df['price'].mean()), 2)
        elif not df.empty:
            comparable_avg = round(float(df['price'].mean()), 2)
        else:
            comparable_avg = 350000.0

        predicted_price = None

        if model is not None:
            # Dynamically identify expected features from trained pipeline
            required_cols = getattr(model, 'feature_names_in_', None)
            if required_cols is None and hasattr(model, 'named_steps'):
                first_step = list(model.named_steps.values())[0]
                required_cols = getattr(first_step, 'feature_names_in_', None)

            if required_cols is None:
                required_cols = ['country', 'bedrooms', 'area']

            input_dict = {}
            for col in required_cols:
                col_lower = str(col).lower()
                if 'country' in col_lower:
                    input_dict[col] = [country.title()]
                elif any(k in col_lower for k in ['bed', 'room']):
                    input_dict[col] = [bedrooms]
                elif any(k in col_lower for k in ['area', 'sqft', 'sqm', 'surface']):
                    input_dict[col] = [area]
                elif any(k in col_lower for k in ['bath']):
                    input_dict[col] = [max(1.0, bedrooms - 1.0)]
                elif any(k in col_lower for k in ['year', 'construction']):
                    input_dict[col] = [2020.0]
                elif any(k in col_lower for k in ['floor']):
                    input_dict[col] = [3.0]
                else:
                    input_dict[col] = [0.0]

            input_df = pd.DataFrame(input_dict)
            try:
                raw_pred = model.predict(input_df)[0]
                predicted_price = float(np.expm1(raw_pred))
            except Exception as pred_err:
                logger.warning(f"Model prediction inference failed, using fallback heuristic: {pred_err}")
                predicted_price = None

        # Fallback valuation model if model was missing or prediction errored
        if predicted_price is None or np.isnan(predicted_price) or predicted_price <= 0:
            base_sqm_rate = comparable_avg / 80.0
            predicted_price = base_sqm_rate * area * (1.0 + (bedrooms - 2.0) * 0.12)

        predicted_price = round(max(10000.0, predicted_price), 2)
        low_bound = round(predicted_price * 0.85, 2)
        high_bound = round(predicted_price * 1.15, 2)

        return jsonify({
            'success': True,
            'predicted_price': predicted_price,
            'confidence_range': {
                'low': low_bound,
                'high': high_bound
            },
            'comparable_avg': comparable_avg,
            'country': country,
            'bedrooms': bedrooms,
            'area': area,
            'currency': 'USD'
        })
    except Exception as e:
        logger.error(f"Error in api_predict: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f"Prediction computation error: {str(e)}"}), 500


@app.route('/api/price-trends', methods=['GET'])
def api_price_trends():
    """
    Group by building_construction_year, compute avg price per year.
    Returns: array of { year, avg_price, count, min_price, max_price } sorted by year.
    """
    try:
        country = request.args.get('country', default='all', type=str).strip()
        df = load_data()

        if df.empty:
            return jsonify({'success': True, 'country': country, 'trends': []})

        sub_df = df
        if country.lower() not in ['all', '', 'tất cả (toàn cầu)', 'global']:
            sub_df = sub_df[sub_df['country'].str.lower() == country.lower()]

        # Filter valid construction years (1850 <= year <= 2035) with non-null prices
        valid_df = sub_df[
            sub_df['building_construction_year'].notna() &
            (sub_df['building_construction_year'] >= 1850) &
            (sub_df['building_construction_year'] <= 2035) &
            sub_df['price'].notna()
        ].copy()

        if valid_df.empty:
            return jsonify({'success': True, 'country': country, 'trends': []})

        valid_df['year'] = valid_df['building_construction_year'].astype(int)

        grouped = valid_df.groupby('year')['price'].agg(
            avg_price='mean',
            count='count',
            min_price='min',
            max_price='max'
        ).reset_index().sort_values(by='year', ascending=True)

        trends = []
        for _, row in grouped.iterrows():
            trends.append({
                'year': int(row['year']),
                'avg_price': round(float(row['avg_price']), 2),
                'count': int(row['count']),
                'min_price': round(float(row['min_price']), 2),
                'max_price': round(float(row['max_price']), 2)
            })

        return jsonify({
            'success': True,
            'country': country,
            'trends': trends
        })
    except Exception as e:
        logger.error(f"Error in api_price_trends: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/compare', methods=['GET'])
def api_compare():
    """
    Compare multiple countries side-by-side.
    Query parameter: countries=<country1,country2,...>
    Returns: for each country:
    { country, avg_price, median_price, total_properties, avg_area, avg_bedrooms, price_per_sqm, top_city, top_city_price }
    """
    try:
        raw_countries = request.args.get('countries', default='', type=str).strip()
        df = load_data()

        if df.empty:
            return jsonify({'success': True, 'comparison': []})

        if not raw_countries:
            # Default to top 4 countries by property volume
            country_list = df['country'].value_counts().head(4).index.tolist()
        else:
            country_list = [c.strip() for c in raw_countries.split(',') if c.strip()]

        comparison = []
        for country in country_list:
            c_df = df[df['country'].str.lower() == country.lower()]
            if c_df.empty:
                comparison.append({
                    'country': country,
                    'avg_price': 0.0,
                    'median_price': 0.0,
                    'total_properties': 0,
                    'avg_area': 0.0,
                    'avg_bedrooms': 0.0,
                    'price_per_sqm': 0.0,
                    'top_city': 'N/A',
                    'top_city_price': 0.0
                })
                continue

            prices = c_df['price'].dropna()
            areas = c_df['area'].dropna()
            bedrooms = c_df['bedrooms'].dropna()

            avg_price = round(float(prices.mean()), 2) if not prices.empty else 0.0
            median_price = round(float(prices.median()), 2) if not prices.empty else 0.0
            total_props = int(len(c_df))
            avg_area = round(float(areas.mean()), 2) if not areas.empty else 0.0
            avg_beds = round(float(bedrooms.mean()), 2) if not bedrooms.empty else 0.0

            # Direct price per square meter computation
            valid_sqm = c_df[(c_df['price'] > 0) & (c_df['area'] > 0)]
            if not valid_sqm.empty:
                price_per_sqm = round(float((valid_sqm['price'] / valid_sqm['area']).mean()), 2)
            elif avg_area > 0:
                price_per_sqm = round(avg_price / avg_area, 2)
            else:
                price_per_sqm = 0.0

            # Identify top city by average valuation
            city_group = c_df.groupby('city')['price'].agg(['mean', 'count'])
            if not city_group.empty:
                reliable_cities = city_group[city_group['count'] >= 2]
                candidate_pool = reliable_cities if not reliable_cities.empty else city_group
                top_row = candidate_pool.sort_values(by='mean', ascending=False).iloc[0]
                top_city = str(top_row.name)
                top_city_price = round(float(top_row['mean']), 2)
            else:
                top_city = 'N/A'
                top_city_price = 0.0

            comparison.append({
                'country': country,
                'avg_price': avg_price,
                'median_price': median_price,
                'total_properties': total_props,
                'avg_area': avg_area,
                'avg_bedrooms': avg_beds,
                'price_per_sqm': price_per_sqm,
                'top_city': top_city,
                'top_city_price': top_city_price
            })

        return jsonify({
            'success': True,
            'comparison': comparison
        })
    except Exception as e:
        logger.error(f"Error in api_compare: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/top-cities', methods=['GET'])
def api_top_cities():
    """
    Return top cities sorted by average price for a specified country or globally.
    Query parameters: country (default 'all'), limit (default 10).
    """
    try:
        country = request.args.get('country', default='all', type=str).strip()
        limit = max(1, min(100, request.args.get('limit', default=10, type=int)))
        df = load_data()

        if df.empty:
            return jsonify({'success': True, 'country': country, 'top_cities': []})

        sub_df = df
        if country.lower() not in ['all', '', 'tất cả (toàn cầu)', 'global']:
            sub_df = sub_df[sub_df['country'].str.lower() == country.lower()]

        if sub_df.empty:
            return jsonify({'success': True, 'country': country, 'top_cities': []})

        grouped = sub_df.groupby('city')['price'].agg(
            avg_price='mean',
            median_price='median',
            property_count='count',
            min_price='min',
            max_price='max'
        ).reset_index().sort_values(by='avg_price', ascending=False).head(limit)

        top_cities = []
        for _, row in grouped.iterrows():
            top_cities.append({
                'city': str(row['city']),
                'avg_price': round(float(row['avg_price']), 2),
                'median_price': round(float(row['median_price']), 2),
                'property_count': int(row['property_count']),
                'min_price': round(float(row['min_price']), 2),
                'max_price': round(float(row['max_price']), 2)
            })

        return jsonify({
            'success': True,
            'country': country,
            'limit': limit,
            'top_cities': top_cities
        })
    except Exception as e:
        logger.error(f"Error in api_top_cities: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/price-distribution', methods=['GET'])
def api_price_distribution():
    """
    Return histogram distribution buckets of property prices.
    Query parameters: country (default 'all'), bins (default 20).
    """
    try:
        country = request.args.get('country', default='all', type=str).strip()
        bins = max(5, min(50, request.args.get('bins', default=20, type=int)))
        df = load_data()

        if df.empty:
            return jsonify({'success': True, 'country': country, 'bins': bins, 'distribution': []})

        sub_df = df
        if country.lower() not in ['all', '', 'tất cả (toàn cầu)', 'global']:
            sub_df = sub_df[sub_df['country'].str.lower() == country.lower()]

        prices = sub_df['price'].dropna()
        if prices.empty:
            return jsonify({'success': True, 'country': country, 'bins': bins, 'distribution': []})

        counts, bin_edges = np.histogram(prices.values, bins=bins)

        distribution = []
        for i in range(len(counts)):
            b_start = float(bin_edges[i])
            b_end = float(bin_edges[i + 1])
            distribution.append({
                'bin_index': i,
                'bin_start': round(b_start, 2),
                'bin_end': round(b_end, 2),
                'label': f"${b_start:,.0f} - ${b_end:,.0f}",
                'count': int(counts[i])
            })

        return jsonify({
            'success': True,
            'country': country,
            'bins': bins,
            'distribution': distribution
        })
    except Exception as e:
        logger.error(f"Error in api_price_distribution: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/global-trends', methods=['GET'])
def api_global_trends():
    """
    Serve global historical property price index data.
    Query params:
      - country: country name (default 'World')
      - metric: 'nominal_index' | 'real_index' | 'nominal_yoy' | 'real_yoy' (default 'real_index')
    Returns: { success, country, metric, data: [{date, value}] }
    """
    try:
        country = request.args.get('country', 'World').strip()
        metric = request.args.get('metric', 'real_index').strip()

        file_map = {
            'real_yoy': GLOBAL_REAL_YEAR,
            'nominal_yoy': GLOBAL_NOMINAL_YEAR,
            'nominal_index': GLOBAL_NOMINAL_INDEX,
            'real_index': GLOBAL_REAL_INDEX
        }

        filepath = file_map.get(metric, GLOBAL_REAL_INDEX)

        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': f'Data file not found for metric: {metric}'}), 404

        df = pd.read_csv(filepath)

        if country.lower() not in ['all', '']:
            sub = df[df['country'].str.lower() == country.lower()]
            if sub.empty:
                return jsonify({'success': True, 'country': country, 'metric': metric, 'data': []})
            df = sub

        df = df.sort_values('date')

        data_points = []
        for _, row in df.iterrows():
            data_points.append({
                'date': row['date'],
                'value': round(float(row['price']), 4) if pd.notna(row['price']) else None,
                'country': row['country'],
                'country_code': row['country_code']
            })

        return jsonify({
            'success': True,
            'country': country,
            'metric': metric,
            'total_records': len(data_points),
            'data': data_points
        })

    except Exception as e:
        logger.error(f"Error in api_global_trends: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/global-countries', methods=['GET'])
def api_global_countries():
    """Return list of countries available in the global historical dataset."""
    try:
        filepath = GLOBAL_REAL_INDEX
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Global data file not found'}), 404

        df = pd.read_csv(filepath)
        countries = sorted(df['country'].dropna().unique().tolist())

        return jsonify({
            'success': True,
            'countries': countries,
            'total': len(countries)
        })

    except Exception as e:
        logger.error(f"Error in api_global_countries: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# -----------------------------------------------------------------------------
# AUTHENTICATION API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    """
    Register a new user account.
    Expects JSON: { email, password, full_name, role, company, phone }
    Validates role in ('agent', 'customer').
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        email = str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))
        full_name = str(data.get('full_name', '')).strip()
        role = str(data.get('role', 'customer')).strip().lower()
        company = str(data.get('company', '')).strip()
        phone = str(data.get('phone', '')).strip()

        if not email or '@' not in email or '.' not in email:
            return jsonify({'success': False, 'error': 'A valid email address is required'}), 400

        if not password or len(password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters in length'}), 400

        if not full_name:
            return jsonify({'success': False, 'error': 'Full name is required'}), 400

        if role not in ['agent', 'customer']:
            role = 'customer'

        db = get_db()
        cursor = db.cursor()

        # Verify email uniqueness
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'error': 'This email address is already registered'}), 409

        password_hash = generate_password_hash(password)
        cursor.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, company, phone)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (email, password_hash, full_name, role, company, phone)
        )
        db.commit()
        user_id = cursor.lastrowid

        # Automatically log the user into session
        session.clear()
        session['user_id'] = user_id
        session['user_email'] = email
        session['user_role'] = role
        session['user_name'] = full_name

        user_info = {
            'id': user_id,
            'email': email,
            'full_name': full_name,
            'role': role,
            'company': company,
            'phone': phone
        }

        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'user': user_info
        }), 201
    except Exception as e:
        logger.error(f"Error in api_signup: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f"Registration failed: {str(e)}"}), 500


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """
    Authenticate an existing user.
    Expects JSON: { email, password }
    Sets session credentials upon successful verification.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        email = str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))

        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400

        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, email, password_hash, full_name, role, company, phone
            FROM users WHERE email = ?
            """,
            (email,)
        )
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

        session.clear()
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_role'] = user['role']
        session['user_name'] = user['full_name']

        user_info = {
            'id': user['id'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'company': user['company'],
            'phone': user['phone']
        }

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_info
        })
    except Exception as e:
        logger.error(f"Error in api_login: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f"Login failed: {str(e)}"}), 500


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    """Clear session data for the current user."""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@app.route('/api/user', methods=['GET'])
def api_user():
    """
    Return currently authenticated user information, or 401 if unauthenticated.
    """
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'authenticated': False,
                'error': 'Unauthorized',
                'message': 'No active session'
            }), 401

        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, email, full_name, role, company, phone, created_at
            FROM users WHERE id = ?
            """,
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            session.clear()
            return jsonify({
                'authenticated': False,
                'error': 'User record no longer exists'
            }), 401

        return jsonify({
            'authenticated': True,
            'user': dict(user)
        })
    except Exception as e:
        logger.error(f"Error in api_user: {e}", exc_info=True)
        return jsonify({'authenticated': False, 'error': str(e)}), 500


# -----------------------------------------------------------------------------
# BUYING, SELLING & PROPERTY MANAGEMENT API ROUTES
# -----------------------------------------------------------------------------

@app.route('/api/property/<int:prop_id>/upload-image', methods=['POST'])
def api_property_upload_image(prop_id):
    """
    Import and attach a .jpg file to property image blanks.
    """
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM properties WHERE id = ?", (prop_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Property not found'}), 404

        file = request.files.get('image') or request.files.get('file')
        if not file or not file.filename:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        filename = secure_filename(file.filename)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            return jsonify({'success': False, 'error': 'Please select a valid .jpg or image file'}), 400

        new_filename = f"prop_{prop_id}_{uuid.uuid4().hex[:8]}{ext}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        file.save(save_path)
        img_url = f"/static/uploads/properties/{new_filename}"

        current_gallery = []
        try:
            current_gallery = json.loads(row['gallery_images']) if row['gallery_images'] else []
        except:
            current_gallery = [row['image_url']] if row['image_url'] else []

        slot_index = request.form.get('slot_index', type=int)
        if slot_index is not None and 0 <= slot_index < len(current_gallery):
            current_gallery[slot_index] = img_url
        else:
            current_gallery.append(img_url)

        cursor.execute("UPDATE properties SET gallery_images = ? WHERE id = ?", (json.dumps(current_gallery), prop_id))
        db.commit()

        return jsonify({
            'success': True,
            'message': 'JPG image imported successfully!',
            'image_url': img_url,
            'gallery': current_gallery
        })
    except Exception as e:
        logger.error(f"Error uploading property image: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/property/<int:prop_id>/buy', methods=['POST'])
def api_property_buy(prop_id):
    """
    Process property purchase or offer with Escrow security.
    """
    try:
        data = request.get_json(silent=True) or request.form
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM properties WHERE id = ?", (prop_id,))
        prop = cursor.fetchone()
        if not prop:
            return jsonify({'success': False, 'error': 'Property not found'}), 404

        current_u = get_current_user()
        buyer_id = current_u['id'] if current_u else None
        buyer_name = str(data.get('buyer_name', current_u['full_name'] if current_u else 'Verified Investor')).strip()
        buyer_email = str(data.get('buyer_email', current_u['email'] if current_u else 'investor@estatevision.io')).strip()
        buyer_phone = str(data.get('buyer_phone', current_u['phone'] if current_u else '+1 (555) 019-2834')).strip()
        offer_amount = float(data.get('offer_amount', prop['price']))
        down_payment = float(data.get('down_payment', offer_amount * 0.2))
        payment_method = str(data.get('payment_method', 'Escrow Bank Transfer')).strip()
        notes = str(data.get('notes', '')).strip()

        tx_code = f"EV-TX-{random.randint(100000, 999999)}"

        cursor.execute('''
            INSERT INTO transactions (
                property_id, buyer_id, buyer_name, buyer_email, buyer_phone,
                seller_id, offer_amount, down_payment, payment_method, status,
                notes, transaction_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            prop_id, buyer_id, buyer_name, buyer_email, buyer_phone,
            prop['seller_id'], offer_amount, down_payment, payment_method,
            'Pending Escrow', notes, tx_code
        ))

        cursor.execute("UPDATE properties SET status = 'under_offer' WHERE id = ?", (prop_id,))
        db.commit()

        return jsonify({
            'success': True,
            'message': f"Purchase offer of ${offer_amount:,.0f} registered with Escrow protection!",
            'transaction_code': tx_code,
            'property_title': prop['title'],
            'offer_amount': offer_amount,
            'down_payment': down_payment,
            'payment_method': payment_method,
            'status': 'Pending Escrow'
        })
    except Exception as e:
        logger.error(f"Error processing property purchase: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/user/transactions', methods=['GET'])
def api_user_transactions():
    """Return all transactions for current authenticated user."""
    try:
        user_id = session.get('user_id')
        db = get_db()
        cursor = db.cursor()
        if user_id:
            cursor.execute('''
                SELECT t.*, p.title as property_title, p.country, p.city, p.image_url
                FROM transactions t
                LEFT JOIN properties p ON t.property_id = p.id
                WHERE t.buyer_id = ? OR t.seller_id = ?
                ORDER BY t.id DESC
            ''', (user_id, user_id))
        else:
            cursor.execute('''
                SELECT t.*, p.title as property_title, p.country, p.city, p.image_url
                FROM transactions t
                LEFT JOIN properties p ON t.property_id = p.id
                ORDER BY t.id DESC LIMIT 5
            ''')
        transactions = [dict(r) for r in cursor.fetchall()]
        return jsonify({'success': True, 'transactions': transactions, 'total': len(transactions)})
    except Exception as e:
        logger.error(f"Error fetching user transactions: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/user/properties', methods=['GET'])
def api_user_properties():
    """Return properties listed by current user."""
    try:
        user_id = session.get('user_id')
        db = get_db()
        cursor = db.cursor()
        if user_id:
            cursor.execute("SELECT * FROM properties WHERE seller_id = ? ORDER BY id DESC", (user_id,))
        else:
            cursor.execute("SELECT * FROM properties ORDER BY id DESC LIMIT 6")
        properties = [dict(r) for r in cursor.fetchall()]
        for p in properties:
            try:
                p['features'] = json.loads(p['features']) if p['features'] else []
            except:
                p['features'] = []
        return jsonify({'success': True, 'properties': properties, 'total': len(properties)})
    except Exception as e:
        logger.error(f"Error fetching user properties: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/global-summary', methods=['GET'])
def api_global_summary():
    """Return high-level summary statistics of the global 1927-2026 dataset."""
    try:
        if not os.path.exists(GLOBAL_REAL_YEAR) or not os.path.exists(GLOBAL_REAL_INDEX):
            return jsonify({'success': False, 'error': 'Global CSV files not found'}), 404

        df_ry = pd.read_csv(GLOBAL_REAL_YEAR)
        df_ri = pd.read_csv(GLOBAL_REAL_INDEX)

        countries = sorted(df_ri['country'].dropna().unique().tolist())
        latest_ry = df_ry.sort_values('date').groupby('country').last().reset_index()

        valid_ry = latest_ry[latest_ry['country'].isin(countries) & ~latest_ry['country'].isin(['World', 'Euro area', 'Advanced economies', 'Emerging market economies (aggregate)'])]
        boomers = valid_ry.sort_values('price', ascending=False).head(5)[['country', 'country_code', 'price']].to_dict(orient='records')
        cooling = valid_ry.sort_values('price', ascending=True).head(5)[['country', 'country_code', 'price']].to_dict(orient='records')

        return jsonify({
            'success': True,
            'total_countries': len(countries),
            'start_year': 1927,
            'end_year': 2026,
            'total_quarterly_records': len(df_ri) + len(df_ry),
            'top_growth_markets': boomers,
            'cooling_markets': cooling
        })
    except Exception as e:
        logger.error(f"Error in api_global_summary: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# -----------------------------------------------------------------------------
# GLOBAL ERROR HANDLERS
# -----------------------------------------------------------------------------
@app.errorhandler(404)
def handle_404(e):
    """Graceful 404 handler for API routes and web views."""
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'error': 'Not Found',
            'message': f"Endpoint '{request.path}' was not found on this server."
        }), 404
    return safe_render_template('errors/404.html', error=e, is_public=True), 404


@app.errorhandler(500)
def handle_500(e):
    """Graceful 500 handler for unexpected exceptions."""
    logger.error(f"Server Internal Error: {e}", exc_info=True)
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected server error occurred while processing the request.'
        }), 500
    return safe_render_template('errors/500.html', error=e, is_public=True), 500


# -----------------------------------------------------------------------------
# APPLICATION ENTRYPOINT
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    # Initialize SQLite database and tables
    init_db()

    # Pre-warm CSV dataset and ML model into memory
    logger.info("Pre-warming dataset and ML model...")
    load_data()
    load_ml_model()

    # Automatically open web browser (Google Chrome) when server starts
    import webbrowser
    import threading

    def open_browser():
        logger.info("Opening browser to http://127.0.0.1:5000 ...")
        webbrowser.open_new("http://127.0.0.1:5000")

    # In debug mode with reloader, only open browser once in the child process
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        threading.Timer(1.2, open_browser).start()

    # Start Flask application server
    logger.info("Starting EstateVision Flask platform on http://127.0.0.1:5000 ...")
    app.run(debug=True, port=5000)

