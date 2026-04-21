import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/cloudinary_config.dart';
import '../models/master_ingredient.dart';
import '../models/unit_model.dart';
import '../models/storage_type.dart';
import '../services/master_ingredient_service.dart';
import '../services/ocr_service.dart';
import '../services/storage_service.dart';
import '../services/api_client.dart';
import 'login.dart';

// Main AddIngredientPage wrapper for backward compatibility
class AddIngredientPage extends StatelessWidget {
  const AddIngredientPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: AddIngredientPageContent(),
    );
  }
}

// Extracted content widget for use in MainContainer
class AddIngredientPageContent extends StatefulWidget {
  const AddIngredientPageContent({super.key});

  @override
  State<AddIngredientPageContent> createState() =>
      _AddIngredientPageContentState();
}

class _AddIngredientPageContentState extends State<AddIngredientPageContent> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _weightController = TextEditingController();

  // ─── State for DB-driven dropdowns ──────────────────────────────────────────
  List<MasterIngredient> _masterIngredients = [];
  List<UnitModel> _allUnits = [];
  List<UnitModel> _filteredUnits = [];
  List<StorageType> _storageTypes = [];

  MasterIngredient? _selectedMaster;
  bool _isNewCustomIngredient = false;
  String _customIngredientName = '';

  UnitModel? _selectedWeightUnit;
  StorageType? _selectedStorageType;

  DateTime _manufactureDate = DateTime.now();
  DateTime _expiryDate = DateTime.now();

  File? _selectedImage;
  String? _cloudinaryImageUrl;
  // Separate OCR image state so scanning doesn't overwrite the main ingredient image
  File? _ocrImage;
  String? _ocrCloudinaryImageUrl;
  bool _isUploading = false;
  bool _isScanning = false;
  bool _isSubmitting = false;
  bool _isLoadingData = true;
  bool _isRestocking = false;

  final ImagePicker _picker = ImagePicker();

  // For the searchable dropdown
  final TextEditingController _nameSearchController = TextEditingController();
  bool _showSuggestions = false;
  List<MasterIngredient> _suggestions = [];

  @override
  void initState() {
    super.initState();
    _loadDropdownData();
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _priceController.dispose();
    _weightController.dispose();
    _nameSearchController.dispose();
    super.dispose();
  }

  // ─── Load all dropdown data in parallel ─────────────────────────────────────
  Future<void> _loadDropdownData() async {
    try {
      final results = await Future.wait([
        MasterIngredientService.getAll(),
        ApiClient.get('/common/units'),
        ApiClient.get('/common/storage-types'),
      ]);

      final masterList = results[0] as List<MasterIngredient>;
      final unitsResp = results[1] as http.Response;
      final storageResp = results[2] as http.Response;

      List<UnitModel> units = [];
      if (unitsResp.statusCode == 200) {
        final j = jsonDecode(unitsResp.body);
        units = (j['units'] as List).map((u) => UnitModel.fromJson(u)).toList();
      }

      List<StorageType> storageTypes = [];
      if (storageResp.statusCode == 200) {
        final j = jsonDecode(storageResp.body);
        storageTypes = (j['storageTypes'] as List)
            .map((s) => StorageType.fromJson(s))
            .toList();
      }

      if (!mounted) return;
      setState(() {
        _masterIngredients = masterList;
        _allUnits = units;
        _storageTypes = storageTypes;
        _selectedStorageType = storageTypes.isNotEmpty
            ? storageTypes.first
            : null;
        // No ingredient selected yet — default to weight family, no pre-fill
        _filteredUnits = units
            .where((u) => u.unitFamily.trim().toLowerCase() == 'weight')
            .toList();
        _selectedWeightUnit = null;
        _isLoadingData = false;
      });
    } catch (e) {
      if (e.toString().contains('401')) {
        _handleUnauthorized();
        return;
      }
      if (mounted) {
        setState(() => _isLoadingData = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to load data: $e')));
      }
    }
  }

  // ─── Master ingredient search ────────────────────────────────────────────────
  void _onNameSearchChanged(String query) {
    setState(() {
      _customIngredientName = query;
      if (query.isEmpty) {
        _showSuggestions = false;
        _suggestions = [];
        _selectedMaster = null;
        _isNewCustomIngredient = false;
        _isRestocking = false;
      } else {
        final lower = query.toLowerCase();
        _suggestions = _masterIngredients
            .where((m) => m.name.toLowerCase().contains(lower))
            .take(8)
            .toList();
        _showSuggestions = true;
        _selectedMaster = null;
        _isNewCustomIngredient = false;
        _isRestocking = false;
      }
    });
  }

  void _selectMasterIngredient(MasterIngredient master) {
    setState(() {
      _selectedMaster = master;
      _isNewCustomIngredient = false;
      _nameSearchController.text = master.name;
      _showSuggestions = false;
      _customIngredientName = master.name;
      // Filter by family AND pre-select the default unit from master_ingredients
      _applyMasterIngredientUnits(master.unitFamily, master.defaultUnitId);
    });
    // Check if this ingredient already exists at this branch
    _checkExistingIngredient(master.masterIngredientId);
  }

  void _selectNewIngredient() {
    setState(() {
      _selectedMaster = null;
      _isNewCustomIngredient = true;
      _showSuggestions = false;
      // New custom ingredient — default weight family, no specific pre-fill
      _applyMasterIngredientUnits('weight', null);
    });
  }

  /// Filters the Weight Unit dropdown to [family] and pre-selects the unit
  /// matching [defaultUnitId] (from master_ingredients.default_unit_id).
  /// Falls back to the first unit in the filtered list when defaultUnitId is
  /// null or not found.
  void _applyMasterIngredientUnits(String family, int? defaultUnitId) {
    final filtered = _allUnits
        .where(
          (u) =>
              u.unitFamily.trim().toLowerCase() == family.trim().toLowerCase(),
        )
        .toList();

    UnitModel? preSelected;
    if (defaultUnitId != null) {
      // Try to find the unit whose unitId matches the default
      try {
        preSelected = filtered.firstWhere((u) => u.unitId == defaultUnitId);
      } catch (_) {
        // default_unit_id not found in filtered list — fall back to first
        preSelected = null;
      }
    }

    setState(() {
      _filteredUnits = filtered;
      _selectedWeightUnit =
          preSelected ?? (filtered.isNotEmpty ? filtered.first : null);
    });
  }

  bool get _isCountFamily =>
      (_selectedMaster?.unitFamily ??
          (_isNewCustomIngredient ? 'weight' : 'weight')) ==
      'count';

  // ─── Check existing ingredient for auto-fill ────────────────────────────────
  Future<void> _checkExistingIngredient(int masterIngredientId) async {
    try {
      final response = await ApiClient.get(
        '/ingredients/existing?master_ingredient_id=$masterIngredientId',
      );

      if (response.statusCode == 204) {
        // No existing ingredient — form stays fresh
        setState(() => _isRestocking = false);
        return;
      }

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final existing = json['ingredient'];

        setState(() {
          _isRestocking = true;

          // Auto-fill storage type
          final storageTypeId = existing['storage_type_id'];
          _selectedStorageType = _storageTypes.firstWhere(
            (st) => st.storageTypeId == storageTypeId,
            orElse: () => _storageTypes.first,
          );

          // Auto-fill weight per unit
          _weightController.text = existing['unit_weight'].toString();

          // Auto-fill weight unit
          final unitId = existing['unit_weight_unit_id'];
          _selectedWeightUnit = _filteredUnits.firstWhere(
            (u) => u.unitId == unitId,
            orElse: () =>
                _filteredUnits.isNotEmpty ? _filteredUnits.first : null!,
          );

          // Auto-fill price
          _priceController.text = existing['price'].toString();

          // Auto-fill image if available
          if (existing['image_url'] != null &&
              existing['image_url'].toString().isNotEmpty) {
            _cloudinaryImageUrl = existing['image_url'];
          }

          // Leave quantity, manufacture date, and expiry date untouched
        });
      }
    } catch (e) {
      if (e.toString().contains('401')) {
        _handleUnauthorized();
      }
      // Silently fail — not critical
    }
  }

  // ─── Date pickers ────────────────────────────────────────────────────────────
  Future<void> _selectManufactureDate(BuildContext ctx) async {
    final now = DateTime.now();
    DateTime initial = _manufactureDate;
    if (initial.isAfter(now)) initial = now;
    if (initial.isBefore(DateTime(2000))) initial = DateTime(2000);

    final picked = await showDatePicker(
      context: ctx,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: now,
    );
    if (picked != null) setState(() => _manufactureDate = picked);
  }

  Future<void> _selectExpiryDate(BuildContext ctx) async {
    final picked = await showDatePicker(
      context: ctx,
      initialDate: _expiryDate.isBefore(_manufactureDate)
          ? _manufactureDate
          : _expiryDate,
      firstDate: _manufactureDate,
      lastDate: DateTime(2101),
    );
    if (picked != null) setState(() => _expiryDate = picked);
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  // ─── Quantity helpers ────────────────────────────────────────────────────────
  void _incrementQuantity() {
    final v = double.tryParse(_quantityController.text) ?? 0.0;
    _quantityController.text = (v + 1.0).toStringAsFixed(0);
  }

  void _decrementQuantity() {
    final v = double.tryParse(_quantityController.text) ?? 0.0;
    if (v > 0) _quantityController.text = (v - 1.0).toStringAsFixed(0);
  }

  // ─── Image upload ────────────────────────────────────────────────────────────
  Future<void> _pickImage() async {
    final XFile? picked = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (picked != null) {
      setState(() => _selectedImage = File(picked.path));
      await _uploadToCloudinary(File(picked.path));
    }
  }

  Future<void> _takePhoto() async {
    final XFile? picked = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (picked != null) {
      setState(() => _selectedImage = File(picked.path));
      await _uploadToCloudinary(File(picked.path));
    }
  }

  Future<void> _uploadToCloudinary(File imageFile) async {
    setState(() => _isUploading = true);
    try {
      final uploaded = await _uploadImageAndGetUrl(imageFile);
      if (uploaded != null) {
        setState(() {
          _cloudinaryImageUrl = uploaded;
          _isUploading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image uploaded successfully!')),
          );
        }
      } else {
        throw Exception('Upload failed');
      }
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    }
  }

  // Upload helper that returns the uploaded image URL without mutating main image state
  Future<String?> _uploadImageAndGetUrl(File imageFile) async {
    try {
      final url = Uri.parse(
        'https://api.cloudinary.com/v1_1/${CloudinaryConfig.cloudName}/image/upload',
      );
      final request = http.MultipartRequest('POST', url)
        ..fields['upload_preset'] = CloudinaryConfig.uploadPreset
        ..fields['folder'] = 'kitchenpal/ingredients'
        ..files.add(await http.MultipartFile.fromPath('file', imageFile.path));

      final response = await request.send();
      if (response.statusCode == 200) {
        final body = await response.stream.bytesToString();
        final j = jsonDecode(body);
        return j['secure_url'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── OCR scan: pick image → upload → extract dates ──────────────────────────
  Future<void> _scanDates() async {
    // Step 1 — let the user choose the image source
    final ImageSource? source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Select image to scan for dates',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: Color(0xFFF59E0B)),
                title: const Text('Take a Photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_library,
                  color: Color(0xFF00C853),
                ),
                title: const Text('Choose from Gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.cancel, color: Colors.grey),
                title: const Text('Cancel'),
                onTap: () => Navigator.pop(ctx),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null) return; // user cancelled

    // Step 2 — pick the image
    final XFile? picked = await _picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (picked == null) return;

    final imageFile = File(picked.path);

    // Use separate OCR image state so we don't overwrite the main ingredient visual
    setState(() {
      _ocrImage = imageFile;
      _isScanning = true;
    });

    try {
      // Upload just for OCR and get the temporary URL
      final uploadedUrl = await _uploadImageAndGetUrl(imageFile);

      if (uploadedUrl == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Image upload failed. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      _ocrCloudinaryImageUrl = uploadedUrl;

      // Step 4 — run OCR on the uploaded URL
      final dates = await OcrService.scanImageUrl(uploadedUrl);
      if (dates != null) {
        bool dateFound = false;
        setState(() {
          if (dates['manufactureDate'] != null) {
            _manufactureDate = dates['manufactureDate']!;
            dateFound = true;
          }
          if (dates['expiryDate'] != null) {
            _expiryDate = dates['expiryDate']!;
            dateFound = true;
          }
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                dateFound
                    ? 'Dates scanned and updated!'
                    : 'Could not detect dates clearly. Please enter manually.',
              ),
              backgroundColor: dateFound ? Colors.green : Colors.orange,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No dates found in image.')),
          );
        }
      }
    } catch (e) {
      if (e.toString().contains('401')) {
        _handleUnauthorized();
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Scan failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isScanning = false);
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  Future<void> _submitIngredient() async {
    final name = _nameSearchController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an ingredient name')),
      );
      return;
    }
    if (_selectedWeightUnit == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a weight unit')),
      );
      return;
    }
    if (_selectedStorageType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a storage type')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final Map<String, dynamic> body = {
        'name': name,
        'quantity_in_stock': double.tryParse(_quantityController.text) ?? 1.0,
        'unit_weight': _isCountFamily
            ? 1.0
            : (double.tryParse(_weightController.text) ?? 0.0),
        'unit_weight_unit_id': _selectedWeightUnit!.unitId,
        'price': double.tryParse(_priceController.text) ?? 0.0,
        'storage_type_id': _selectedStorageType!.storageTypeId,
        'manufacture_date': _manufactureDate.toIso8601String(),
        'expiry_date': _expiryDate.toIso8601String(),
        'image_url': _cloudinaryImageUrl,
      };

      // Include master_ingredient_id only if an existing one is selected
      if (_selectedMaster != null) {
        body['master_ingredient_id'] = _selectedMaster!.masterIngredientId;
      }
      // If _isNewCustomIngredient == true, leave master_ingredient_id absent → backend creates new

      final response = await ApiClient.post('/ingredients', body: body);

      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ingredient added successfully!'),
              backgroundColor: Color(0xFFF59E0B),
            ),
          );
          _clearForm();
        }
      } else {
        final err = jsonDecode(response.body);
        throw Exception(err['error'] ?? 'Failed to add ingredient');
      }
    } catch (e) {
      if (e.toString().contains('401')) {
        _handleUnauthorized();
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _clearForm() {
    _nameSearchController.clear();
    _quantityController.clear();
    _priceController.clear();
    _weightController.clear();
    setState(() {
      _selectedMaster = null;
      _isNewCustomIngredient = false;
      _customIngredientName = '';
      _showSuggestions = false;
      _suggestions = [];
      _selectedWeightUnit = _filteredUnits.isNotEmpty
          ? _filteredUnits.first
          : null;
      _selectedStorageType = _storageTypes.isNotEmpty
          ? _storageTypes.first
          : null;
      _manufactureDate = DateTime.now();
      _expiryDate = DateTime.now();
      _selectedImage = null;
      _cloudinaryImageUrl = null;
      _ocrImage = null;
      _ocrCloudinaryImageUrl = null;
      _isRestocking = false;
    });
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(
                  Icons.photo_library,
                  color: Color(0xFF00C853),
                ),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage();
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: Color(0xFFF59E0B)),
                title: const Text('Take a Photo'),
                onTap: () {
                  Navigator.pop(ctx);
                  _takePhoto();
                },
              ),
              ListTile(
                leading: const Icon(Icons.cancel, color: Colors.grey),
                title: const Text('Cancel'),
                onTap: () => Navigator.pop(ctx),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleUnauthorized() {
    StorageService.clearAuthData().then((_) {
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginPage()),
          (route) => false,
        );
      }
    });
  }

  // ─── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_isLoadingData) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
      );
    }

    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── RESTOCK BANNER ───────────────────────────────────────────
                if (_isRestocking)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3CD),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFFB84D)),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.info_outline,
                          color: Color(0xFFF59E0B),
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: const Text(
                            'Restocking existing ingredient — Storage type, weight and price have been pre-filled. Please enter quantity and dates for this new delivery.',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF856404),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // ── INGREDIENT IMAGE ─────────────────────────────────────────
                const Text(
                  'INGREDIENT IMAGE',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.black54,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _showImageSourceDialog,
                  child: Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.grey.shade300,
                        width: 2,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: _isUploading
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                CircularProgressIndicator(
                                  color: Color(0xFFF59E0B),
                                ),
                                SizedBox(height: 12),
                                Text(
                                  'Uploading...',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : _selectedImage != null
                        ? Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(
                                  _selectedImage!,
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: GestureDetector(
                                  onTap: () => setState(() {
                                    _selectedImage = null;
                                    _cloudinaryImageUrl = null;
                                  }),
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Icon(
                                      Icons.close,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(
                                  color: const Color.fromARGB(
                                    255,
                                    245,
                                    242,
                                    232,
                                  ),
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                child: const Icon(
                                  Icons.add_a_photo,
                                  color: Color(0xFFF59E0B),
                                  size: 28,
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'Tap to upload photo',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'JPG, PNG or HEIC up to 10MB',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.black45,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 24),

                // ── BASIC INFORMATION ─────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'BASIC INFORMATION',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.black54,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Ingredient Name (searchable)
                      const Text(
                        'Ingredient Name',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black87,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _nameSearchController,
                            onChanged: _onNameSearchChanged,
                            decoration: InputDecoration(
                              hintText: 'e.g. Whole Milk, Arabica Beans',
                              hintStyle: const TextStyle(
                                color: Colors.black38,
                                fontSize: 14,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                ),
                              ),
                              suffixIcon:
                                  (_selectedMaster != null ||
                                      _isNewCustomIngredient)
                                  ? const Icon(
                                      Icons.check_circle,
                                      color: Colors.green,
                                    )
                                  : null,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                            ),
                          ),
                          if (_showSuggestions && _suggestions.isNotEmpty ||
                              (_showSuggestions &&
                                  _customIngredientName.isNotEmpty))
                            Container(
                              margin: const EdgeInsets.only(top: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border.all(color: Colors.grey.shade300),
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.05),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  ..._suggestions.map(
                                    (m) => ListTile(
                                      dense: true,
                                      title: Text(
                                        m.name,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                      onTap: () => _selectMasterIngredient(m),
                                    ),
                                  ),
                                  if (_customIngredientName.isNotEmpty)
                                    ListTile(
                                      dense: true,
                                      leading: const Icon(
                                        Icons.add,
                                        color: Color(0xFFF59E0B),
                                      ),
                                      title: Text(
                                        '+ Add as new ingredient: "${_customIngredientName}"',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFFF59E0B),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      onTap: _selectNewIngredient,
                                    ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Quantity and Price
                      Row(
                        children: [
                          // Quantity
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Quantity',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black87,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: _quantityController,
                                          keyboardType: TextInputType.number,
                                          textAlign: TextAlign.center,
                                          decoration: const InputDecoration(
                                            hintText: '0',
                                            hintStyle: TextStyle(
                                              color: Colors.black38,
                                              fontSize: 14,
                                            ),
                                            border: InputBorder.none,
                                            contentPadding:
                                                EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 10,
                                                ),
                                          ),
                                        ),
                                      ),
                                      Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          InkWell(
                                            onTap: _incrementQuantity,
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 4,
                                                  ),
                                              decoration: BoxDecoration(
                                                border: Border(
                                                  left: BorderSide(
                                                    color: Colors.grey.shade300,
                                                  ),
                                                  bottom: BorderSide(
                                                    color: Colors.grey.shade300,
                                                  ),
                                                ),
                                              ),
                                              child: const Icon(
                                                Icons.keyboard_arrow_up,
                                                size: 16,
                                              ),
                                            ),
                                          ),
                                          InkWell(
                                            onTap: _decrementQuantity,
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 4,
                                                  ),
                                              decoration: BoxDecoration(
                                                border: Border(
                                                  left: BorderSide(
                                                    color: Colors.grey.shade300,
                                                  ),
                                                ),
                                              ),
                                              child: const Icon(
                                                Icons.keyboard_arrow_down,
                                                size: 16,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Price
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Price Per Unit',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.black87,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _priceController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '\Rs 0.00',
                                    hintStyle: const TextStyle(
                                      color: Colors.black38,
                                      fontSize: 14,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      borderSide: BorderSide(
                                        color: Colors.grey.shade300,
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      borderSide: BorderSide(
                                        color: Colors.grey.shade300,
                                      ),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Storage Type
                      const Text(
                        'Storage Type',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black87,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<StorageType>(
                            value: _selectedStorageType,
                            isExpanded: true,
                            icon: const Icon(Icons.arrow_drop_down),
                            onChanged: (v) =>
                                setState(() => _selectedStorageType = v),
                            items: _storageTypes
                                .map(
                                  (s) => DropdownMenuItem(
                                    value: s,
                                    child: Text(
                                      s.name,
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Weight and Weight Unit (hidden for count family)
                      if (!_isCountFamily) ...[
                        Row(
                          children: [
                            // Weight
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Weight Per Unit',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.black87,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _weightController,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      hintText: '0.00',
                                      hintStyle: const TextStyle(
                                        color: Colors.black38,
                                        fontSize: 14,
                                      ),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: BorderSide(
                                          color: Colors.grey.shade300,
                                        ),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: BorderSide(
                                          color: Colors.grey.shade300,
                                        ),
                                      ),
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 10,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Weight Unit
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Weight Unit',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.black87,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: Colors.grey.shade300,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<UnitModel>(
                                        value: _selectedWeightUnit,
                                        isExpanded: true,
                                        icon: const Icon(Icons.arrow_drop_down),
                                        onChanged: (v) => setState(
                                          () => _selectedWeightUnit = v,
                                        ),
                                        items: _filteredUnits
                                            .map(
                                              (u) => DropdownMenuItem(
                                                value: u,
                                                child: Text(
                                                  u.code,
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                  ),
                                                ),
                                              ),
                                            )
                                            .toList(),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ── INVENTORY DATES ───────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'INVENTORY DATES',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.black54,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Scan button
                      Center(
                        child: ElevatedButton.icon(
                          onPressed: _isScanning ? null : _scanDates,
                          icon: _isScanning
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.document_scanner),
                          label: Text(
                            _isScanning
                                ? 'Scanning...'
                                : 'Scan Dates from Image',
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2196F3),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Manufacture Date
                      GestureDetector(
                        onTap: () => _selectManufactureDate(context),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE3F2FD),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.factory,
                                  color: Color(0xFF2196F3),
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Manufacture Date',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.black54,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatDate(_manufactureDate),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.calendar_month,
                                color: Color(0xFF00C853),
                                size: 24,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Expiry Date
                      GestureDetector(
                        onTap: () => _selectExpiryDate(context),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFEBEE),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.calendar_today,
                                  color: Colors.red,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Expiry Date',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.black54,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatDate(_expiryDate),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.black87,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.calendar_month,
                                color: Color(0xFF00C853),
                                size: 24,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ── ADD INGREDIENT BUTTON ─────────────────────────────────────
                ElevatedButton(
                  onPressed: (_isSubmitting || _isUploading)
                      ? null
                      : _submitIngredient,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    elevation: 0,
                  ),
                  child: (_isSubmitting || _isUploading)
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Add Ingredient',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
