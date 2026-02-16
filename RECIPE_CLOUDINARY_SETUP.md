# Recipe Page with Cloudinary Integration - Setup Complete! ✅

## What's Been Implemented

### Frontend (Angular Admin Portal)

- ✅ Recipe component now integrated with **UploadService**
- ✅ Image upload with validation (5MB max, image types only)
- ✅ Real-time upload progress indicator with spinner
- ✅ Cloudinary URL replaces preview after successful upload
- ✅ Disabled states during upload (upload button + save button)
- ✅ Error handling with user-friendly alerts
- ✅ Upload service configured to call backend API

### Backend (Node.js/Express)

- ✅ Cloudinary service (`cloudinaryService.js`) with upload/delete functions
- ✅ Upload controller (`uploadController.js`) with endpoints:
  - `POST /api/upload/image` - Single image upload
  - `POST /api/upload/images` - Multiple images upload
  - `DELETE /api/upload/image/:publicId` - Delete image
- ✅ Upload routes registered at `/api/upload`
- ✅ Multer configured with memory storage
- ✅ Authentication middleware applied
- ✅ Recipe controller handles `image_url` field

### Database

- ✅ Schema includes `recipes` table with `image_url` field
- ✅ Recipe ingredients and steps tables ready
- ✅ Recipe images table for multiple images per recipe

## What You Need to Do

### 1. Get Cloudinary Credentials (Required!)

1. Go to [cloudinary.com](https://cloudinary.com) and sign up/log in
2. Go to your Dashboard
3. Copy these three values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Update Backend .env File

Open `backend/.env` and replace the placeholder values:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

### 3. Restart Your Backend

If your backend is running, restart it to pick up the new environment variables:

```powershell
# From your workspace root
.\stop.ps1
.\start.ps1
```

Or if running manually:

```powershell
cd backend
npm start
```

### 4. Test the Integration

1. Start your admin portal (if not already running):

   ```powershell
   cd KitchenPal-admin
   npm start
   ```

2. Navigate to the Recipes page

3. Click "New Recipe" button

4. Upload an image:
   - Click "📷 Upload Image" button
   - Select an image file (JPEG, PNG, GIF, WebP)
   - Watch the upload progress (spinner and "Uploading..." text)
   - After upload, you should see the preview image
   - "Create Recipe" button will be disabled during upload

5. Fill in recipe details:
   - Recipe name
   - Cooking time (minutes)
   - Base price
   - Description (optional)
   - Add ingredients with quantities and units
   - Add cooking steps

6. Click "Create Recipe"

7. Recipe should be saved with the Cloudinary image URL in the database

## How It Works

```
User selects image
    ↓
Frontend validates (size, type)
    ↓
Shows local preview
    ↓
Uploads to backend API (/api/upload/image)
    ↓
Backend (multer) receives file in memory
    ↓
Cloudinary service uploads to cloud
    ↓
Returns Cloudinary URL
    ↓
Frontend replaces preview with Cloudinary URL
    ↓
User fills recipe details
    ↓
Saves recipe with Cloudinary URL to database
```

## Troubleshooting

### "Failed to upload image" Error

- Check backend console for detailed error
- Verify Cloudinary credentials in backend/.env
- Ensure backend is running
- Check file size (must be < 5MB)
- Check file type (must be image/jpeg, image/png, image/gif, or image/webp)

### Image Upload Never Completes

- Check browser console for errors
- Verify backend is accessible at `http://localhost:3000`
- Check network tab to see if API call is made

### Recipe Saves but No Image

- Verify the Cloudinary URL was returned successfully
- Check browser console for upload response
- Verify `image_url` field is being sent in the POST request

### Backend Errors

- Check if Cloudinary package is installed: `npm list cloudinary`
- If not: `cd backend && npm install`
- Verify all environment variables are set correctly
- Check backend logs for specific error messages

## API Endpoints

### Upload Single Image

```http
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
  image: <file>

Response:
{
  "image_url": "https://res.cloudinary.com/your-cloud/image/upload/..."
}
```

### Create Recipe

```http
POST /api/recipes
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "branch_id": 1,
  "name": "Chocolate Cake",
  "image_url": "https://res.cloudinary.com/...",
  "cooking_time_minutes": 60,
  "base_price": 25.00,
  "description": "Delicious chocolate cake",
  "ingredients": [
    {
      "ingredient_id": 1,
      "quantity_required": 2.5,
      "unit_id": 2
    }
  ],
  "steps": [
    "Preheat oven to 350°F",
    "Mix ingredients...",
    "Bake for 30 minutes"
  ]
}
```

## Next Steps (Optional Enhancements)

- [ ] Add image cropping/resizing before upload
- [ ] Support multiple recipe images (gallery)
- [ ] Add drag & drop image upload
- [ ] Show upload progress bar (percentage)
- [ ] Add image compression on frontend before upload
- [ ] Cache uploaded images to avoid re-uploading same file
- [ ] Add "Remove Image" button to delete and re-upload

## Files Modified

### Frontend

- `src/app/features/recipes/recipes.ts` - Added UploadService integration
- `src/app/features/recipes/recipes.html` - Added upload progress UI
- `src/app/features/recipes/recipes.scss` - Added spinner and overlay styles
- `src/app/core/services/upload.service.ts` - Updated to use backend API

### Backend

- `src/services/cloudinaryService.js` - Created
- `src/controllers/uploadController.js` - Created
- `src/routes/uploadRoutes.js` - Created
- `src/routes/index.js` - Registered upload routes
- `src/config/config.js` - Added Cloudinary configuration
- `.env` - Added Cloudinary environment variables (needs your credentials)

---

**Ready to test!** Just add your Cloudinary credentials and restart the backend. 🚀
