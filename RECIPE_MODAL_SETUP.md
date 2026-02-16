# Recipe Management with Cloudinary Image Upload - Setup Guide

## Overview

The recipe management feature now includes a modal dialog for adding new recipes with Cloudinary image upload functionality.

## Features

✅ **Modal Dialog** - Clean popup interface for adding recipes
✅ **Image Upload** - Direct upload to Cloudinary with preview
✅ **Form Validation** - Ensures all required fields are filled
✅ **Upload Progress** - Shows loading state during image upload
✅ **Auto Upload** - Images upload automatically when selected
✅ **Image Preview** - Shows selected image before saving

## Setup Instructions

### 1. Get Cloudinary Credentials

1. Visit [Cloudinary](https://cloudinary.com/users/register_free) and create a free account
2. From your Cloudinary Dashboard, get:
   - **Cloud Name** (visible on dashboard)
   - **Upload Preset** (Settings > Upload > Add upload preset > Enable "Unsigned")
   - Note: For unsigned uploads, make sure to create an "Unsigned" upload preset

### 2. Configure Frontend (Angular Admin)

Edit: `KitchenPal-admin/src/app/core/services/upload.service.ts`

Replace the placeholder values:

```typescript
private cloudName = 'your-cloud-name'; // Replace with your Cloudinary cloud name
private uploadPreset = 'your-upload-preset'; // Replace with your upload preset
```

**OR** Update in the recipes component constructor:

Edit: `KitchenPal-admin/src/app/features/recipes/recipes.ts`

Uncomment and update line 42:

```typescript
constructor(
  private recipeService: RecipeService,
  private uploadService: UploadService
) {
  // Configure Cloudinary with your credentials
  this.uploadService.setConfig('your-cloud-name', 'your-upload-preset');
}
```

### 3. Configure Backend (Optional - for future enhancements)

The backend configuration has been added but is not yet used. To use it in the future:

1. Create a `.env` file in the `backend/` directory (copy from `.env.example`)
2. Add your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

3. Install Cloudinary package (when needed for backend processing):
```bash
cd backend
npm install cloudinary
```

### 4. Backend API Endpoints (To Be Implemented)

The frontend is ready to consume the following API endpoints:

- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

**Recipe Data Structure:**
```json
{
  "name": "Recipe Name",
  "description": "Brief description",
  "instructions": "Step-by-step instructions",
  "imageUrl": "https://res.cloudinary.com/...",
  "totalCost": 10.50,
  "suggestedPrice": 15.99,
  "discount": 10
}
```

## How to Use

1. **Start the Admin Panel:**
   ```bash
   cd KitchenPal-admin
   npm start
   ```

2. **Navigate to Recipes:**
   - Go to the Recipes page
   - Click the "New Recipe" button (➕ New Recipe)

3. **Add Recipe:**
   - Click the image upload area to select an image
   - Image uploads automatically to Cloudinary
   - Fill in recipe details (name, description, pricing)
   - Click "Add Recipe" to save

## File Structure

```
KitchenPal-admin/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── upload.service.ts          # Cloudinary upload service
│   │   │       └── recipe.service.ts          # Recipe API service
│   │   ├── features/
│   │   │   └── recipes/
│   │   │       ├── recipes.ts                 # Main recipes component
│   │   │       ├── recipes.html               # Recipes template
│   │   │       └── recipes.scss               # Recipes styles
│   │   └── shared/
│   │       └── components/
│   │           └── recipe-modal/
│   │               ├── recipe-modal.ts        # Modal component logic
│   │               ├── recipe-modal.html      # Modal template
│   │               └── recipe-modal.scss      # Modal styles
│   └── environments/
│       └── environment.ts                      # API configuration

backend/
├── src/
│   └── config/
│       ├── config.js                           # Backend config (Cloudinary added)
└── .env.example                                # Environment variables template
```

## Testing

1. **Test Image Upload:**
   - Select an image (PNG, JPG up to 5MB)
   - Verify preview appears
   - Check browser console for upload success message
   - Verify image URL is set

2. **Test Form Validation:**
   - Try submitting without required fields
   - Verify "Add Recipe" button is disabled when invalid

3. **Test Modal:**
   - Open and close modal
   - Verify form resets when closed

## Troubleshooting

### Image Upload Fails

- **Check Cloudinary credentials** are correct
- **Verify upload preset** is set to "Unsigned" in Cloudinary dashboard
- **Check browser console** for error messages
- **Verify file size** is under 5MB
- **Check file type** is an image (PNG, JPG, etc.)

### Modal Doesn't Open

- **Check browser console** for errors
- **Verify** RecipeModal is imported in recipes component
- **Ensure** HttpClientModule is imported

### API Errors

- **Backend not running**: Start backend with `npm start` in backend directory
- **CORS errors**: Verify FRONTEND_URL in backend .env matches your admin panel URL
- **404 errors**: Recipe API endpoints need to be implemented in backend

## Next Steps

1. **Implement Backend Recipe API** - Create recipe CRUD endpoints
2. **Add Database Schema** - Create recipes table in PostgreSQL
3. **Add Ingredients** - Link recipe ingredients with quantities
4. **Add Recipe Categories** - Categorize recipes (breakfast, lunch, etc.)
5. **Add Search & Filters** - Enhanced recipe search functionality

## Notes

- Images are uploaded directly from the browser to Cloudinary (no backend involvement)
- The image URL from Cloudinary is stored in the database
- Current implementation uses mock data; integrate with real API when ready
- Make sure to keep your Cloudinary credentials secure (use environment variables)
