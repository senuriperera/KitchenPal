<div align="center">

<img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop&crop=center" alt="KitchenPal Banner" width="100%" style="border-radius: 12px;" />

<br/><br/>

# 🍳 KitchenPal

### *Smarter Kitchens. Less Waste. More Savings.*

**A food waste management platform for modern cafe chains**

<br/>

[![Backend](https://img.shields.io/badge/Backend-Node.js%2018+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2015-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Admin](https://img.shields.io/badge/Admin-Angular%2020-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io)
[![Mobile](https://img.shields.io/badge/Mobile-Flutter%203.41-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[![CI Backend](https://img.shields.io/github/actions/workflow/status/RamindaDulmin/KitchenPal_New/backend_pipeline.yml?label=Backend%20CI&style=flat-square&logo=github)](https://github.com)
[![CI Mobile](https://img.shields.io/github/actions/workflow/status/RamindaDulmin/KitchenPal_New/mobile_pipeline.yml?label=Mobile%20CI&style=flat-square&logo=github)](https://github.com)
[![CI Admin](https://img.shields.io/github/actions/workflow/status/RamindaDulmin/KitchenPal_New/admin_pipeline.yml?label=Admin%20CI&style=flat-square&logo=github)](https://github.com)

</div>

---

## 📖 What is KitchenPal?

**KitchenPal** is a full-stack, multi-platform food waste management system designed for cafe chains. It combines **real-time inventory tracking**, **recipe generation**, and **smart discount management** to minimize food waste and maximize savings — all from a single platform.

> Restaurants waste up to **10% of food** before it even reaches the customer. KitchenPal changes that.

<br/>

<div align="center">
<img src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1000&h=350&fit=crop&crop=center" alt="Kitchen Management" width="80%" style="border-radius:8px"/>
</div>

---

## ✨ Features at a Glance

<table>
<tr>
<td width="50%">

### 📦 Inventory Management
Track every ingredient with expiry dates, quantities, units, and storage types. FIFO batch deduction ensures nothing goes unnoticed.

### 🤖 Recipe Generation
Automatically generate creative recipes from ingredients nearing expiry — powered by intelligent suggestion workflows.

### 🔔 Smart Notifications
Real-time WebSocket alerts for expiring stock. Configurable day-thresholds and auto-resolution tracking keep your team on top of things.

### 💰 Discount Approval Workflow
Branch managers propose discounts on at-risk recipes. Admins review and approve — all in real time.

</td>
<td width="50%">

### 📊 Analytics & Reports
Monthly waste statistics, savings calculations, top-wasted-ingredient tracking, and exportable reports to guide purchasing decisions.

### 🧾 Sales & Auto-Deduction
Record sales and automatically deduct the right ingredients from inventory using batch-level FIFO logic.

### 🏢 Multi-Branch Support
Manage multiple cafe locations from a single admin dashboard with branch-specific data isolation.

### 🔐 Secure Authentication
JWT-based sessions, Google OAuth login, and role-based access control (Admin / Branch Manager / Staff).

</td>
</tr>
</table>

---

## 🏗️ Architecture

KitchenPal is a **three-tier, multi-platform system**:

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENTS                          │
│                                                         │
│   📱 Flutter Mobile App    🖥️ Angular Admin Dashboard   │
│   (iOS & Android)          (Web Browser)                │
└──────────────┬──────────────────────┬───────────────────┘
               │   REST API + Socket.IO│
               ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                    │
│                                                         │
│  Express.js  │  JWT Auth  │  Google OAuth  │  node-cron │
│  Socket.IO   │  Cloudinary│  Google Vision │  Jest Tests │
└──────────────────────────┬──────────────────────────────┘
                           │
               ┌───────────▼───────────┐
               │   PostgreSQL 15 DB    │
               │   17+ Tables · FIFO   │
               │   Docker Volume       │
               └───────────────────────┘
```

| Layer | Technology | Port |
|-------|-----------|------|
| REST API | Node.js + Express | `3000` |
| Admin Dashboard | Angular 20 | `4200` |
| Database | PostgreSQL 15 | `5433` (external) |
| DB Admin | pgAdmin 4 | `5050` |

---

## 🛠️ Tech Stack

<div align="center">

| Area | Technologies |
|------|-------------|
| **Backend** | Node.js 18, Express.js, Socket.IO, node-cron, JWT, Passport.js |
| **Database** | PostgreSQL 15, custom SQL schema (17+ tables) |
| **Admin Panel** | Angular 20, TypeScript, Chart.js, RxJS |
| **Mobile** | Flutter 3.41, Dart 3.10, Provider, FL Chart |
| **AI / Vision** | Google Cloud Vision API (OCR), AI recipe generation |
| **Media** | Cloudinary CDN |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Testing** | Jest + Supertest (backend), Flutter test (mobile) |

</div>

<br/>

<div align="center">
<img src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1000&h=300&fit=crop&crop=center" alt="Fresh Ingredients" width="80%" style="border-radius:8px"/>
</div>

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- [Git](https://git-scm.com/)
- Node.js 18+ *(only for local dev without Docker)*

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/KitchenPal_New.git
cd KitchenPal_New
```

### 2. Configure Environment

```bash
# Copy the example environment file
copy backend\.env.example backend\.env
```

Edit `backend\.env` with your settings:

```env
NODE_ENV=development
PORT=3000

# PostgreSQL (Docker will use these)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=kitchenpal
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123

# Security — change in production!
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-super-secret-session-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend
FRONTEND_URL=http://localhost:4200
```

### 3. Launch Everything

```bash
docker-compose up -d
```

This spins up **all four services** automatically:

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:3000/api | — |
| Health Check | http://localhost:3000/api/health | — |
| Angular Admin | http://localhost:4200 | — |
| pgAdmin | http://localhost:5050 | `admin@kitchenpal.com` / `admin123` |
| PostgreSQL | `localhost:5433` | `postgres` / `postgres123` |

### 4. Verify It's Running

```bash
docker-compose ps
curl http://localhost:3000/api/health
```

---

## 📱 Mobile App Setup (Flutter)

```bash
cd KitchenPal-Mobile
flutter pub get
flutter run
```

> Make sure your device/emulator can reach your backend API. Update `lib/config/` with your local IP if testing on a physical device.

**Build APK:**
```bash
flutter build apk --release
```

---

## 🖥️ Admin Dashboard Setup (Angular)

```bash
cd KitchenPal-admin
npm install
ng serve
```

The dashboard will be available at **http://localhost:4200**.

**Production Build:**
```bash
ng build --configuration=production
```

---

## 💻 Backend — Local Development (Without Docker)

```bash
cd backend
npm install

# Set up local PostgreSQL and apply schema
psql -U postgres -d kitchenpal -f complete_schema.sql

# Start dev server with hot-reload
npm run dev
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/logout` | Logout current session |
| `GET` | `/api/auth/me` | Get current user info |
| `GET` | `/api/auth/google` | Google OAuth login |

> All protected endpoints require: `Authorization: Bearer <token>`

### Ingredients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ingredients/branch/:id` | List all ingredients |
| `GET` | `/api/ingredients/branch/:id/expiring` | Get expiring ingredients |
| `GET` | `/api/ingredients/branch/:id/stats` | Monthly stats |
| `POST` | `/api/ingredients` | Add ingredient |
| `PUT` | `/api/ingredients/:id` | Update ingredient |
| `DELETE` | `/api/ingredients/:id` | Delete ingredient |

### Recipes & Suggestions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/recipes/branch/:id` | List recipes |
| `POST` | `/api/recipes/branch/:id/matching` | Find matching recipes |
| `POST` | `/api/suggestions/generate` | Generate AI recipe suggestion |
| `PUT` | `/api/suggestions/:id/approve` | Admin approve |
| `PUT` | `/api/suggestions/:id/reject` | Admin reject |
| `PUT` | `/api/suggestions/:id/discount` | Update discount % |

### Sales & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sales` | Record a sale (auto-deducts inventory) |
| `GET` | `/api/sales/branch/:id/statistics` | Sales statistics |
| `GET` | `/api/analytics/dashboard` | Dashboard summary |
| `GET` | `/api/analytics/waste` | Waste analytics |
| `GET` | `/api/analytics/savings` | Savings report |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications/branch/:id` | List notifications |
| `POST` | `/api/notifications/branch/:id/auto-create` | Auto-generate expiry alerts |
| `PUT` | `/api/notifications/:id/resolve` | Mark as resolved |

---

## 🔄 Typical Workflow

```
1. Staff adds ingredient with expiry date
          ↓
2. Cron job detects expiring stock → creates notification
          ↓
3. AI generates recipe using expiring ingredients
          ↓
4. Branch manager proposes a discount
          ↓
5. Admin approves the discount in the dashboard
          ↓
6. Discounted recipe appears on menu
          ↓
7. Sale is recorded → inventory auto-deducted (FIFO)
          ↓
8. Analytics updated — waste reduced, savings tracked ✅
```

---

## ⚙️ Docker Commands

```bash
# Start all services
docker-compose up -d

# View live logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and wipe all data (fresh start)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up -d --build
```

---

## 🧪 Running Tests

**Backend (Jest + Supertest):**
```bash
cd backend
npm test
npm run test:coverage
```

**Mobile (Flutter):**
```bash
cd KitchenPal-Mobile
flutter test
flutter analyze
```

---

## 🔁 CI/CD Pipelines

GitHub Actions automatically runs on every push:

| Pipeline | Trigger | Steps |
|----------|---------|-------|
| **Backend** | Push to `main` | Install → Test → Coverage Report |
| **Mobile** | Push to `main` | Flutter analyze → Test → Build APK |
| **Admin** | Push to `main` | Install → Build |

---

## 🗄️ Database Schema

17+ tables powering the platform:

```
branches          users             sessions
master_ingredients  stock_ingredients  ingredient_batches
units             storage_types
recipes           recipe_ingredients  recipe_steps
recipe_images     recipe_keywords
generated_recipes  recipe_suggestions
sales             sale_deductions
notifications     waste_logs         discounts
```

<br/>

<div align="center">
<img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&h=300&fit=crop&crop=center" alt="Food Planning" width="80%" style="border-radius:8px"/>
</div>

---

## 🐛 Troubleshooting

<details>
<summary><strong>Database connection failed</strong></summary>

```bash
docker-compose ps                  # check all services are Up
docker-compose logs postgres       # view DB logs
docker-compose restart postgres    # restart database
```
</details>

<details>
<summary><strong>Port already in use</strong></summary>

```bash
# Windows — find what's using the port
netstat -ano | findstr :3000

# Stop KitchenPal containers first
docker-compose down
```
</details>

<details>
<summary><strong>Reset to clean state</strong></summary>

```bash
docker-compose down -v   # removes volumes (all data)
docker-compose up -d     # fresh start with schema auto-applied
```
</details>

<details>
<summary><strong>Mobile app can't reach the API</strong></summary>

Update the base URL in `KitchenPal-Mobile/lib/config/` to your machine's local IP address (e.g., `192.168.x.x:3000`) instead of `localhost` when testing on a physical device.
</details>

---

## 📂 Project Structure

```
KitchenPal_New/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── controllers/      # Route logic (14 controllers)
│   │   ├── models/           # Data models (11 models)
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, error handling
│   │   ├── cron/             # Expiry notification jobs
│   │   ├── services/         # OCR & external services
│   │   └── server.js
│   ├── tests/
│   ├── Dockerfile
│   └── complete_schema.sql
│
├── KitchenPal-admin/         # Angular 20 admin dashboard
│   └── src/app/
│       ├── core/             # Guards, interceptors, services
│       ├── features/         # Dashboard, recipes, reports…
│       └── shared/
│
├── KitchenPal-Mobile/        # Flutter mobile app
│   └── lib/
│       ├── pages/            # 12 UI pages
│       ├── models/           # 18+ Dart models
│       ├── services/         # API layer
│       └── widgets/
│
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml
└── complete_schema.sql
```

---

<div align="center">

## 🌱 Built to Reduce Food Waste

<img src="https://images.unsplash.com/photo-1542223189-67a03fa0f0bd?w=800&h=250&fit=crop&crop=center" alt="Sustainable Kitchen" width="70%" style="border-radius:8px"/>

<br/><br/>

**KitchenPal** — turning expiring ingredients into opportunities.

<br/>

[![Made with Node.js](https://img.shields.io/badge/Made%20with-Node.js-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Made with Flutter](https://img.shields.io/badge/Made%20with-Flutter-02569B?style=flat-square&logo=flutter)](https://flutter.dev)
[![Made with Angular](https://img.shields.io/badge/Made%20with-Angular-DD0031?style=flat-square&logo=angular)](https://angular.io)
[![PostgreSQL](https://img.shields.io/badge/Powered%20by-PostgreSQL-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)

<br/>

📝 **MIT License** — Free to use, modify, and distribute.

*For issues and questions, please [open an issue](https://github.com/your-username/KitchenPal_New/issues) on the repository.*

</div>
