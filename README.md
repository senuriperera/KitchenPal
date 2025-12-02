# KitchenPal Backend

A comprehensive food waste management system for cafe chains, built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **User Authentication**: Google OAuth & Manual login with JWT sessions
- **Inventory Management**: Track ingredients with expiry dates, quantities, and storage types
- **Recipe Management**: Standard and AI-generated recipes
- **Smart Notifications**: Automatic alerts for expiring ingredients
- **Recipe Suggestions**: AI-powered recipe generation using expiring ingredients
- **Discount Management**: Dynamic pricing with admin approval workflow
- **Sales Tracking**: Automatic inventory deduction on sales
- **Analytics**: Monthly waste and savings statistics

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

## 🛠️ Quick Start with Docker

### 1. Clone the repository

```bash
cd c:\S\Final_Project_New_Version
```

### 2. Create environment file

```bash
copy backend\.env.example backend\.env
```

Edit `backend\.env` and configure your settings:

```env
NODE_ENV=development
PORT=3000

# Database (Docker will use these)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=kitchenpal
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Session Secret (change in production!)
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Google OAuth (optional - get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### 3. Start the application

```bash
docker-compose up -d
```

This will:

- Start PostgreSQL database on port 5433
- Start pgAdmin on port 5050
- Initialize database schema automatically
- Start Node.js backend on port 3000

### 4. Access the services

- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **Database**: localhost:5433 (external) / postgres:5432 (internal)
- **pgAdmin**: http://localhost:5050

#### pgAdmin Login Credentials:

- **Email**: `admin@kitchenpal.com`
- **Password**: `admin123`

#### Connect to Database in pgAdmin:

1. Open pgAdmin at http://localhost:5050
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab**: Name = `KitchenPal DB`
4. **Connection Tab**:
   - Host: `postgres`
   - Port: `5432`
   - Database: `kitchenpal`
   - Username: `postgres`
   - Password: `postgres123`
5. Click "Save"

### 5. Verify it's running

```bash
docker-compose ps
```

Check health:

```bash
curl http://localhost:3000/api/health
```

### 5. View logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Database only
docker-compose logs -f postgres
```

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Ingredients

- `GET /api/ingredients/branch/:branch_id` - Get all ingredients
- `GET /api/ingredients/branch/:branch_id/expiring` - Get expiring ingredients
- `GET /api/ingredients/branch/:branch_id/stats` - Get monthly statistics
- `GET /api/ingredients/:id` - Get ingredient details
- `POST /api/ingredients` - Create ingredient
- `PUT /api/ingredients/:id` - Update ingredient
- `DELETE /api/ingredients/:id` - Delete ingredient

### Recipes

- `GET /api/recipes/branch/:branch_id` - Get all recipes
- `GET /api/recipes/:id` - Get recipe details
- `POST /api/recipes` - Create recipe
- `POST /api/recipes/branch/:branch_id/matching` - Find matching recipes
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Notifications

- `GET /api/notifications/branch/:branch_id` - Get all notifications
- `GET /api/notifications/:id` - Get notification details
- `POST /api/notifications` - Create notification
- `POST /api/notifications/branch/:branch_id/auto-create` - Auto-create expiry notifications
- `PUT /api/notifications/:id/resolve` - Resolve notification
- `DELETE /api/notifications/:id` - Delete notification

### Recipe Suggestions

- `GET /api/suggestions/branch/:branch_id` - Get all suggestions
- `GET /api/suggestions/:id` - Get suggestion details
- `POST /api/suggestions/generate` - Generate recipe suggestion
- `PUT /api/suggestions/:id/approve` - Approve suggestion (Admin only)
- `PUT /api/suggestions/:id/reject` - Reject suggestion (Admin only)
- `PUT /api/suggestions/:id/discount` - Update discount (Admin only)
- `DELETE /api/suggestions/:id` - Delete suggestion

### Sales

- `GET /api/sales/branch/:branch_id` - Get all sales
- `GET /api/sales/branch/:branch_id/statistics` - Get sales statistics
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales` - Create sale (auto-deducts inventory)
- `DELETE /api/sales/:id` - Delete sale

### Common

- `GET /api/common/units` - Get all units (kg, g, l, ml, etc.)
- `GET /api/common/storage-types` - Get all storage types

## 🗄️ Database Schema

The database includes the following tables:

- `users` - User accounts
- `sessions` - Active user sessions
- `branches` - Cafe branch information
- `ingredients` - Inventory items
- `units` - Measurement units
- `storage_types` - Storage categories
- `recipes` - Recipe database
- `recipe_ingredients` - Recipe ingredient mappings
- `recipe_steps` - Cooking instructions
- `recipe_images` - Recipe photos
- `notifications` - Expiry alerts
- `recipe_suggestions` - AI-generated suggestions
- `discounts` - Discount approvals
- `sales` - Sales transactions

## 🔧 Development

### Local development without Docker

1. Install dependencies:

```bash
cd backend
npm install
```

2. Set up PostgreSQL locally and update `backend\.env`:

```env
DATABASE_HOST=localhost
```

3. Run database migrations:

```bash
psql -U postgres -d kitchenpal -f complete_schema.sql
```

4. Start development server:

```bash
npm run dev
```

### Stop the application

```bash
docker-compose down
```

### Remove all data (including database)

```bash
docker-compose down -v
```

### Rebuild containers

```bash
docker-compose up -d --build
```

## 🔐 Authentication

### Manual Login

```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}

POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Google OAuth

1. Visit `http://localhost:3000/api/auth/google`
2. Complete Google authentication
3. Redirect to frontend with token

### Using Protected Endpoints

Add token to headers:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Workflow Example

### 1. Create Ingredient

```bash
POST /api/ingredients
{
  "branch_id": 1,
  "name": "Milk",
  "quantity": 10,
  "unit_id": 3,
  "price": 5.99,
  "expiry_date": "2025-12-01",
  "manufacture_date": "2025-11-20",
  "storage_type_id": 1,
  "image_url": "/uploads/milk.jpg"
}
```

### 2. Check Expiring Ingredients

```bash
GET /api/ingredients/branch/1/expiring?days=7
```

### 3. Generate Recipe Suggestion

```bash
POST /api/suggestions/generate
{
  "branch_id": 1,
  "ingredient_ids": [1, 2, 3],
  "notification_id": 5
}
```

### 4. Admin Approves Discount

```bash
PUT /api/suggestions/1/approve
{
  "admin_discount_percentage": 30,
  "admin_notes": "Approved with modified discount"
}
```

### 5. Create Sale

```bash
POST /api/sales
{
  "branch_id": 1,
  "recipe_id": 5,
  "discount_id": 2,
  "quantity_sold": 3,
  "notes": "Customer order"
}
```

## 🐛 Troubleshooting

### Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port already in use

```bash
# Stop containers
docker-compose down

# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# Kill the process or change ports in docker-compose.yml
```

### Reset database

```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## 📝 License

MIT

## 👥 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for reducing food waste**
