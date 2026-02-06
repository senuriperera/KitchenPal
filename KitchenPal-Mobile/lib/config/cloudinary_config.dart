class CloudinaryConfig {
  // Replace these with your actual Cloudinary credentials
  // Get them from: https://console.cloudinary.com/

  static const String cloudName = 'dzf4mceyk';
  static const String uploadPreset = 'kitchenpal';

  // Optional: API Key and Secret (for signed uploads - more secure)
  // static const String apiKey = 'YOUR_API_KEY';
  // static const String apiSecret = 'YOUR_API_SECRET';
}

// INSTRUCTIONS TO SET UP CLOUDINARY:
// 
// 1. Sign up at https://cloudinary.com (free tier available)
// 
// 2. Get your Cloud Name:
//    - Go to Dashboard
//    - Copy your "Cloud name"
//    - Replace 'YOUR_CLOUD_NAME' above
// 
// 3. Create an Upload Preset (for unsigned uploads):
//    - Go to Settings > Upload
//    - Scroll to "Upload presets"
//    - Click "Add upload preset"
//    - Set Signing Mode to "Unsigned"
//    - Name it (e.g., "kitchenpal_ingredients")
//    - Save
//    - Copy the preset name
//    - Replace 'YOUR_UPLOAD_PRESET' above
// 
// 4. Run: flutter pub get
// 
// 5. You're ready to upload images!
