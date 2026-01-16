import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:cloudinary_public/cloudinary_public.dart';
import '../config/cloudinary_config.dart';

class OCRService {
  final ImagePicker _picker = ImagePicker();

  final CloudinaryPublic _cloudinary = CloudinaryPublic(
    CloudinaryConfig.cloudName,
    CloudinaryConfig.uploadPreset,
    cache: false,
  );

  // TODO: Sync with AuthService URL
  final String _baseUrl = 'http://192.168.1.61:3000/api/ingredients/scan';

  Future<Map<String, DateTime?>?> pickAndScanImage(String token) async {
    try {
      // 1. Pick Image
      final XFile? image = await _picker.pickImage(source: ImageSource.camera);
      if (image == null) return null;

      // 2. Upload to Cloudinary
      CloudinaryResponse response = await _cloudinary.uploadFile(
        CloudinaryFile.fromFile(
          image.path,
          resourceType: CloudinaryResourceType.Image,
        ),
      );

      String imageUrl = response.secureUrl;

      // 3. Send URL to Backend
      final backendResponse = await http.post(
        Uri.parse(_baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token', // Assuming Bearer token auth
        },
        body: jsonEncode({'imageUrl': imageUrl}),
      );

      if (backendResponse.statusCode == 200) {
        final data = jsonDecode(backendResponse.body);
        return {
          'expiryDate': data['expiryDate'] != null
              ? DateTime.parse(data['expiryDate'])
              : null,
          'manufactureDate': data['manufactureDate'] != null
              ? DateTime.parse(data['manufactureDate'])
              : null,
        };
      } else {
        throw Exception(
          'Backend Error ${backendResponse.statusCode}: ${backendResponse.body}',
        );
      }
    } catch (e) {
      print('OCR Service Error: $e');
      rethrow;
    }
  }
}
