# BAI - Billing and Inventory Management System

A comprehensive web application for managing billing and inventory operations built with React.js frontend and FastAPI backend.

## ✨ Recent Updates

### 🔧 API Configuration and Error Fixes (Latest)
- **Centralized API Configuration**: Created `frontend/src/config/api.config.ts` for all backend endpoints
- **Fixed Authentication Issues**: Resolved 403 Forbidden errors by adding proper auth headers to all API calls
- **Port Mismatch Resolution**: Fixed ERR_CONNECTION_REFUSED by updating frontend to use port 8001 (backend port)
- **Eliminated Hardcoded URLs**: All API endpoints now use centralized configuration
- **Enhanced Security**: Centralized authentication header management with Bearer token support
- **Type-Safe API Access**: Added helper functions for building URLs and managing headers

### 🔧 API Data Issues Fixed (Previous)
- **Fixed Missing Data**: Created seed data for Delivery Notes, Shipments, Sales Returns, Credits, and Payment Logs
- **Resolved "Blank" Pages**: Pages were blank because there was no data in the database, not due to broken APIs
- **Data Population**: Added comprehensive seed script (`seed_simple_data.py`) to populate all missing modules
- **API Status**: All APIs are working correctly (200 status codes), data is now visible in the frontend
- **Cleanup Script**: Added `cleanup_data.py` to reset test data when needed

### 🎨 UI Consistency Improvements (Latest)
- **Header Alignment**: Fixed Invoice History page header to be left-aligned like other pages
- **Uniform Layout**: Ensured consistent header styling across all pages

### 🔧 Invoice History Page Improvements (Previous)
- **Fixed Number Formatting**: Resolved currency formatting issues showing malformed amounts like `₹01157.513033.954052.11`
- **Eliminated NaN Values**: Fixed calculation errors that displayed `₹NaN` in pending amounts
- **Enhanced Currency Display**: Implemented proper Indian Rupee formatting using `Intl.NumberFormat`
- **Improved Styling**: Modern glass-morphism design with hover effects and better visual hierarchy
- **Better UX**: Added collection percentages, overdue indicators, and enhanced card layouts
- **Safe Data Handling**: Added utilities to handle string/number conversion preventing display errors

### 🚀 Core Features

- **User Authentication**: JWT-based authentication with login/logout functionality
- **Dashboard**: Real-time analytics with total stock value, monthly sales, and key metrics
- **Inventory Management**: Items, categories, expiry tracking, and inventory logs
- **Sales Management**: Customers, invoices, delivery notes, sales history, returns, credits, payments, and shipments
- **Purchase Management**: Vendors, purchase orders, received items, bills, payments, and vendor credits
- **Responsive Design**: Modern UI with purple theme and mobile-friendly interface
- **API Documentation**: Auto-generated OpenAPI documentation

## ✅ Integration Status

### Sales Module - **100% Complete**
All Sales module pages are fully functional with complete API integration and premium notification system:

- **Tax Invoice** ✅ Production-ready with adhoc customers, PDF generation, notifications
- **Customer Management** ✅ Full CRUD operations, search, filters, notifications
- **Invoice History** ✅ Complete with real-time data and notifications
- **Delivery Notes** ✅ API integrated with professional notifications
- **Sales Returns** ✅ Full workflow with status management and notifications
- **Credit Tracking** ✅ Customer credit management with notifications
- **Payment Log** ✅ Payment recording and tracking with notifications
- **Shipment Records** ✅ Comprehensive shipment management with notifications

### Key Achievements
- **Real-time API Integration**: All sales pages use live backend data
- **Premium Notification System**: Enterprise-grade alerts throughout the application
- **Type-safe Development**: Full TypeScript integration with backend schemas
- **Production-ready UX**: Loading states, error handling, and professional design
- **Comprehensive Testing**: End-to-end functionality verification completed

### Current Focus
- **Purchase Module**: Next phase for complete API integration
- **Inventory Module**: Enhanced features and real-time updates
- **Advanced Analytics**: Dashboard improvements and reporting features

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **PostgreSQL**: Primary database (SQLite for development)
- **JWT**: JSON Web Tokens for authentication
- **Alembic**: Database migrations
- **Pydantic**: Data validation and settings management
- **Pytest**: Testing framework

### Frontend
- **React.js**: User interface library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client
- **React Router**: Client-side routing

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL (for production)
- uv (Python package manager)

## 🔧 Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd poc_ba
   ```

2. **Navigate to backend directory**
   ```bash
   cd backend
   ```

3. **Create virtual environment using uv**
   ```bash
   uv venv poc
   ```

4. **Activate virtual environment**
   ```bash
   # Windows
   poc\Scripts\activate
   
   # macOS/Linux
   source poc/bin/activate
   ```

5. **Install dependencies**
   ```bash
   uv pip install -r requirements.txt
   ```

6. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   DATABASE_URL=postgresql://user:password@localhost:5432/bai_db
   ```

7. **Database Setup**
   ```bash
   # Create database tables
   alembic upgrade head
   ```

8. **Start the backend server**
   ```bash
   python -m uvicorn app.main:app --reload --port 8001
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🌐 API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "is_admin": false
  }
}
```

#### POST /api/auth/register
Register new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "1234567890",
  "address": "123 Main St"
}
```

#### GET /api/auth/me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

#### PUT /api/auth/me
Update current user information (requires authentication).

#### POST /api/auth/change-password
Change user password (requires authentication).

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

#### POST /api/auth/logout
Logout user (requires authentication).

### Inventory Endpoints

#### GET /api/inventory/items
Get all inventory items.

#### POST /api/inventory/items
Create new inventory item.

#### GET /api/inventory/items/{item_id}
Get specific inventory item.

#### PUT /api/inventory/items/{item_id}
Update inventory item.

#### DELETE /api/inventory/items/{item_id}
Delete inventory item.

#### GET /api/inventory/categories
Get all item categories.

#### POST /api/inventory/categories
Create new item category.

### Sales Endpoints

#### GET /api/sales/customers
Get all customers.

#### POST /api/sales/customers
Create new customer.

#### GET /api/sales/invoices
Get all invoices.

#### POST /api/sales/invoices
Create new invoice.

### Purchase Endpoints

#### GET /api/purchases/vendors
Get all vendors.

#### POST /api/purchases/vendors
Create new vendor.

#### GET /api/purchases/orders
Get all purchase orders.

#### POST /api/purchases/orders
Create new purchase order.

### Dashboard Endpoints

#### GET /api/dashboard/stats
Get dashboard statistics.

**Response:**
```json
{
  "total_stock_value": 125000,
  "monthly_sales": 45000,
  "active_customers": 156,
  "pending_orders": 23,
  "low_stock_items": 8
}
```

## 🧪 Testing

### Backend Tests

Run all tests:
```bash
cd backend
pytest
```

Run specific test file:
```bash
pytest tests/test_auth_service.py
```

Run with coverage:
```bash
pytest --cov=app tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📁 Project Structure

```
poc_ba/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── database/
│   │   ├── __init__.py
│   │   └── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   └── purchases.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   ├── purchases.py
│   │   └── dashboard.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   └── purchases.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py
│   ├── utils/
│   │   ├── __init__.py
│   │   └── auth_deps.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth_service.py
│   │   └── test_auth_router.py
│   ├── alembic/
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopNavbar.tsx
│   │   │   └── Common/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── NotFound.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── authService.ts
│   │   ├── types/
│   │   │   └── auth.ts
│   │   ├── utils/
│   │   │   └── AuthContext.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Deployment

### Backend Deployment

1. **Set environment variables**
   ```bash
   export SECRET_KEY=your-production-secret-key
   export DATABASE_URL=postgresql://user:password@your-db-host:5432/bai_db
   ```

2. **Install production dependencies**
   ```bash
   uv pip install -r requirements.txt
   ```

3. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start production server**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

### Frontend Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Serve static files**
   ```bash
   npm run preview
   ```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Pydantic
- CORS protection
- SQL injection prevention with SQLAlchemy ORM
- Request rate limiting (production)

## 🔍 Development Tools

- **API Documentation**: Available at `http://localhost:8001/docs`
- **Interactive API Explorer**: Available at `http://localhost:8001/redoc`
- **Database Migrations**: Alembic for schema management
- **Code Quality**: PEP8 compliance, type hints
- **Testing**: Comprehensive unit tests with pytest

## 📝 Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://user:password@localhost:5432/bai_db
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8001
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests to ensure they pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please contact the development team.

---

**Note**: This project follows production-grade development practices with proper error handling, logging, testing, and documentation. 