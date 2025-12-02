# KitchenPal Backend - Project Structure

```
c:\S\Final_Project_New_Version\
│
├── complete_schema.sql       # PostgreSQL database schema
├── docker-compose.yml        # Docker services configuration
├── README.md                 # Main documentation
├── API_TESTING_GUIDE.md      # API testing examples
├── PROJECT_STRUCTURE.md      # Architecture overview
├── start.ps1                 # Quick start script (Windows)
├── stop.ps1                  # Stop script (Windows)
│
└── backend/                  # Backend application folder
    ├── .dockerignore         # Docker ignore file
    ├── .env                  # Environment variables (local)
    ├── .env.example          # Environment template
    ├── .gitignore            # Git ignore file
    ├── Dockerfile            # Node.js container configuration
    ├── package.json          # Node.js dependencies
    │
    ├── src/                  # Source code
    │   ├── server.js         # Express server entry point
    │   │
    │   ├── config/           # Configuration files
    │   │   ├── config.js     # App configuration
    │   │   └── database.js   # PostgreSQL connection pool
    │   │
    │   ├── models/           # Database models (MVC - Model)
    │   │   ├── User.js       # User model
    │   │   ├── Session.js    # Session model
    │   │   ├── Ingredient.js # Ingredient model
    │   │   ├── Recipe.js     # Recipe model
    │   │   ├── Notification.js  # Notification model
    │   │   ├── RecipeSuggestion.js  # Recipe suggestion model
    │   │   ├── Discount.js   # Discount model
    │   │   ├── Sale.js       # Sale model
    │   │   └── CommonModels.js  # Units & Storage types
    │   │
    │   ├── controllers/      # Business logic (MVC - Controller)
    │   │   ├── authController.js
    │   │   ├── ingredientController.js
    │   │   ├── recipeController.js
    │   │   ├── notificationController.js
    │   │   ├── recipeSuggestionController.js
    │   │   ├── saleController.js
    │   │   └── commonController.js
    │   │
    │   ├── routes/           # API routes (MVC - View/Router)
    │   │   ├── index.js      # Route aggregator
    │   │   ├── authRoutes.js
    │   │   ├── ingredientRoutes.js
    │   │   ├── recipeRoutes.js
    │   │   ├── notificationRoutes.js
    │   │   ├── recipeSuggestionRoutes.js
    │   │   ├── saleRoutes.js
    │   │   └── commonRoutes.js
    │   │
    │   ├── middleware/       # Express middleware
    │   │   ├── auth.js       # JWT authentication
    │   │   ├── authorize.js  # Role-based authorization
    │   │   ├── passport.js   # Passport strategies
    │   │   ├── validate.js   # Request validation
    │   │   └── errorHandler.js  # Global error handler
    │   │
    │   └── utils/           # Utility functions
    │       ├── discountCalculator.js  # Discount logic
    │       ├── ragService.js          # RAG model integration
    │       ├── uploadHandler.js       # File upload handler
    │       └── helpers.js             # General helpers
    │
    └── uploads/             # Uploaded files directory
        └── .gitkeep
```

## Architecture Overview

### MVC Pattern

- **Models**: Database interaction and business logic
- **Controllers**: Request handling and response formatting
- **Routes**: API endpoint definitions and request validation

### Key Features

1. **Authentication & Authorization**

   - JWT-based authentication
   - Google OAuth integration
   - Session management
   - Role-based access control

2. **Inventory Management**

   - CRUD operations for ingredients
   - Expiry tracking
   - Storage type categorization
   - Unit management

3. **Recipe System**

   - Standard recipes
   - AI-generated recipes
   - Ingredient matching
   - Recipe suggestions

4. **Notification System**

   - Auto-creation for expiring items
   - Manual notifications
   - Resolution tracking

5. **Discount Workflow**

   - AI-suggested discounts
   - Admin approval process
   - Dynamic pricing

6. **Sales & Analytics**
   - Sales recording
   - Automatic inventory deduction
   - Monthly statistics
   - Waste tracking

## Database Tables

1. **branches** - Cafe branch information
2. **users** - User accounts
3. **sessions** - Active sessions
4. **units** - Measurement units
5. **storage_types** - Storage categories
6. **ingredients** - Inventory items
7. **recipes** - Recipe database
8. **recipe_ingredients** - Recipe-ingredient mapping
9. **recipe_steps** - Cooking instructions
10. **recipe_images** - Recipe photos
11. **notifications** - Expiry alerts
12. **recipe_suggestions** - AI suggestions
13. **discounts** - Discount approvals
14. **sales** - Sales transactions

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: Passport.js, JWT
- **Validation**: Express Validator
- **Security**: Helmet, CORS
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose

## Environment Variables

See `.env.example` for all configuration options:

- Database connection
- JWT secrets
- Google OAuth credentials
- File upload settings
- RAG model API (optional)

## API Endpoints Summary

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google`

### Ingredients

- `GET/POST /api/ingredients`
- `GET/PUT/DELETE /api/ingredients/:id`
- `GET /api/ingredients/branch/:branch_id/expiring`
- `GET /api/ingredients/branch/:branch_id/stats`

### Recipes

- `GET/POST /api/recipes`
- `GET/PUT/DELETE /api/recipes/:id`
- `POST /api/recipes/branch/:branch_id/matching`

### Notifications

- `GET/POST /api/notifications`
- `PUT /api/notifications/:id/resolve`
- `POST /api/notifications/branch/:branch_id/auto-create`

### Suggestions

- `POST /api/suggestions/generate`
- `PUT /api/suggestions/:id/approve`
- `PUT /api/suggestions/:id/reject`

### Sales

- `GET/POST /api/sales`
- `GET /api/sales/branch/:branch_id/statistics`

### Common

- `GET /api/common/units`
- `GET /api/common/storage-types`

## Deployment

### Development (Docker)

```powershell
.\start.ps1
```

### Production

1. Update environment variables
2. Use production database
3. Enable HTTPS
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

## Security Considerations

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt
- SQL injection prevention via parameterized queries
- CORS configured for specific origins
- Helmet.js for security headers
- File upload restrictions
- Role-based access control

## Future Enhancements

- [ ] Real RAG model integration
- [ ] Email notifications
- [ ] Mobile app API optimizations
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Unit tests
- [ ] CI/CD pipeline
