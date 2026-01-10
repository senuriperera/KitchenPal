# Quick Start: Cloudinary Integration

## What's Been Added

✅ **Image Picker** - Users can select images from gallery or take photos
✅ **Cloudinary Upload** - Images are automatically uploaded to Cloudinary
✅ **Image Preview** - Shows selected image with option to remove
✅ **Upload Progress** - Loading indicator during upload
✅ **Image URL Storage** - Cloudinary URL saved for backend integration

## Setup (3 Steps)

### 1. Get Cloudinary Credentials

Visit: https://cloudinary.com/users/register_free

After signup, get:

- **Cloud Name** (from Dashboard)
- **Upload Preset** (Settings > Upload > Create unsigned preset)

### 2. Update Configuration

Edit: `lib/config/cloudinary_config.dart`

```dart
static const String cloudName = 'your-cloud-name-here';
static const String uploadPreset = 'your-preset-name-here';
```

### 3. Add Permissions

**Android** (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```

**iOS** (`ios/Runner/Info.plist`):

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>To upload ingredient images</string>
<key>NSCameraUsageDescription</key>
<string>To take photos of ingredients</string>
```

## How It Works

1. **User taps image area** → Bottom sheet appears
2. **Select source** → Gallery or Camera
3. **Image selected** → Preview shows immediately
4. **Auto upload** → Sends to Cloudinary in background
5. **URL stored** → `_cloudinaryImageUrl` contains the image URL
6. **Send to backend** → Use this URL when submitting the form

## Code Example: Using the Image URL

```dart
// In the Add Ingredient button
if (_cloudinaryImageUrl != null) {
  // Send to your backend
  await http.post(
    Uri.parse('YOUR_BACKEND_URL/ingredients'),
    body: {
      'name': _nameController.text,
      'quantity': _quantityController.text,
      'imageUrl': _cloudinaryImageUrl, // Cloudinary URL here
      // ... other fields
    },
  );
}
```

## Testing

1. Run: `flutter run`
2. Navigate to Add Ingredient page
3. Tap the image upload area
4. Select "Choose from Gallery" or "Take a Photo"
5. Image uploads automatically
6. Check Cloudinary dashboard to see uploaded image

## File Structure

```
lib/
├── config/
│   └── cloudinary_config.dart     # Your credentials go here
├── pages/
│   └── add_ingredient_page.dart   # Image upload integrated
└── ...
```

## Important Variables

- `_selectedImage` - Local image file
- `_cloudinaryImageUrl` - Uploaded image URL (use this!)
- `_isUploading` - Upload status (for showing loading)

## Next Steps

1. Set up your Cloudinary account
2. Add your credentials to `cloudinary_config.dart`
3. Add platform permissions
4. Test the upload
5. Integrate with your backend API

See `CLOUDINARY_SETUP.md` for detailed instructions!
