import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/ingredient.dart';
import '../services/ingredient_service.dart';
import '../services/storage_service.dart';
import '../config/cloudinary_config.dart';

class IngredientDetailPage extends StatefulWidget {
  final Ingredient ingredient;

  const IngredientDetailPage({super.key, required this.ingredient});

  @override
  State<IngredientDetailPage> createState() => _IngredientDetailPageState();
}

class _IngredientDetailPageState extends State<IngredientDetailPage> {
  bool _isEditMode = false;
  bool _isSaving = false;
  bool _isUploading = false;

  late TextEditingController _nameController;
  late TextEditingController _quantityController;
  late TextEditingController _priceController;
  late TextEditingController _weightController;
  late DateTime _expiryDate;
  late DateTime _manufactureDate;
  late String _selectedStorage;
  late String _selectedWeightUnit;
  
  String? _cloudinaryImageUrl;
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();

  final List<String> _storageTypes = ['Pantry', 'Fridge', 'Freezer'];
  final List<String> _weightUnits = ['Grams (g)', 'Kilograms (kg)', 'Liters (L)', 'Milliliters (ml)'];

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _nameController = TextEditingController(text: widget.ingredient.name);
    _quantityController = TextEditingController(text: widget.ingredient.quantityInStock.toString());
    _priceController = TextEditingController(text: widget.ingredient.costPerUnit.toString());
    _weightController = TextEditingController(text: widget.ingredient.weight?.toString() ?? '0');
    _expiryDate = widget.ingredient.expiryDate;
    _manufactureDate = widget.ingredient.manufactureDate ?? DateTime.now();
    _cloudinaryImageUrl = widget.ingredient.imageUrl;
    
    // Map storage type
    _selectedStorage = _mapStorageTypeIdToName(widget.ingredient.storageTypeId);
    
    // Map weight unit
    _selectedWeightUnit = _mapWeightUnitIdToName(widget.ingredient.weightUnitId ?? 2);
  }

  String _mapStorageTypeIdToName(int id) {
    switch (id) {
      case 1: return 'Fridge';
      case 2: return 'Freezer';
      case 3: return 'Pantry';
      default: return 'Pantry';
    }
  }

  int _getStorageId(String storageName) {
    switch (storageName) {
      case 'Fridge': return 1;
      case 'Freezer': return 2;
      case 'Pantry': return 3;
      default: return 3;
    }
  }

  String _mapWeightUnitIdToName(int id) {
    switch (id) {
      case 1: return 'Kilograms (kg)';
      case 2: return 'Grams (g)';
      case 3: return 'Liters (L)';
      case 4: return 'Milliliters (ml)';
      default: return 'Grams (g)';
    }
  }

  int _getUnitId(String unitName) {
    switch (unitName) {
      case 'Kilograms (kg)': return 1;
      case 'Grams (g)': return 2;
      case 'Liters (L)': return 3;
      case 'Milliliters (ml)': return 4;
      default: return 2;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    if (_nameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an ingredient name')),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final Map<String, dynamic> ingredientData = {
        'branch_id': widget.ingredient.branchId,
        'name': _nameController.text,
        'quantity': double.tryParse(_quantityController.text) ?? 0.0,
        'unit_id': widget.ingredient.unitId,
        'price': double.tryParse(_priceController.text) ?? 0.0,
        'storage_type_id': _getStorageId(_selectedStorage),
        'expiry_date': _expiryDate.toIso8601String(),
        'manufacture_date': _manufactureDate.toIso8601String(),
        'image_url': _cloudinaryImageUrl,
        'weight': double.tryParse(_weightController.text) ?? 0.0,
        'weight_unit_id': _getUnitId(_selectedWeightUnit),
      };

      await IngredientService.updateIngredient(
        widget.ingredient.ingredientId,
        ingredientData,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ingredient updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() {
          _isEditMode = false;
        });
        Navigator.pop(context, true); // Return true to indicate changes were made
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update ingredient: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _deleteIngredient() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Ingredient'),
        content: Text('Are you sure you want to delete ${widget.ingredient.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await IngredientService.deleteIngredient(widget.ingredient.ingredientId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ingredient deleted successfully')),
          );
          Navigator.pop(context, true); // Return true to indicate deletion
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete ingredient: $e')),
          );
        }
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
        });
        await _uploadToCloudinary(File(pickedFile.path));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking image: $e')),
      );
    }
  }

  Future<void> _uploadToCloudinary(File imageFile) async {
    setState(() {
      _isUploading = true;
    });

    try {
      final url = Uri.parse(
        'https://api.cloudinary.com/v1_1/${CloudinaryConfig.cloudName}/image/upload',
      );

      var request = http.MultipartRequest('POST', url);
      request.fields['upload_preset'] = CloudinaryConfig.uploadPreset;
      request.fields['folder'] = 'kitchenpal/ingredients';

      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      var response = await request.send();

      if (response.statusCode == 200) {
        final responseData = await response.stream.bytesToString();
        final jsonResponse = json.decode(responseData);

        setState(() {
          _cloudinaryImageUrl = jsonResponse['secure_url'];
          _isUploading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image uploaded successfully!')),
        );
      } else {
        throw Exception('Upload failed with status: ${response.statusCode}');
      }
    } catch (e) {
      setState(() {
        _isUploading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: const Color(0xFF2C2C54),
        foregroundColor: Colors.white,
        title: Text(_isEditMode ? 'Edit Ingredient' : 'Ingredient Details'),
        actions: [
          if (!_isEditMode)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {
                setState(() {
                  _isEditMode = true;
                });
              },
            ),
        ],
      ),
      body: _isSaving
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF2C2C54),
              ),
            )
          : SafeArea(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildImageSection(),
                      const SizedBox(height: 24),
                      _buildBasicInformationSection(),
                      const SizedBox(height: 24),
                      _buildInventoryDatesSection(),
                      const SizedBox(height: 24),
                      if (_isEditMode) _buildActionButtons(),
                      if (!_isEditMode) _buildDeleteButton(),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'INGREDIENT VISUAL',
          style: TextStyle(
            fontSize: 12,
            color: Colors.black54,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: _isEditMode ? _pickImage : null,
          child: Container(
            height: 180,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.grey.shade300,
                width: 2,
              ),
            ),
            child: _isUploading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(
                          color: Color(0xFF00C853),
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
                          if (_isEditMode)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedImage = null;
                                    _cloudinaryImageUrl = null;
                                  });
                                },
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
                    : (_cloudinaryImageUrl != null && _cloudinaryImageUrl!.isNotEmpty)
                        ? Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  _cloudinaryImageUrl!,
                                  width: double.infinity,
                                  height: double.infinity,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return _buildPlaceholderImage();
                                  },
                                ),
                              ),
                              if (_isEditMode)
                                Positioned(
                                  top: 8,
                                  right: 8,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _cloudinaryImageUrl = null;
                                      });
                                    },
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
                        : _isEditMode
                            ? Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE8F5E9),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    child: const Icon(
                                      Icons.add_a_photo,
                                      color: Color(0xFF00C853),
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
                              )
                            : _buildPlaceholderImage(),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderImage() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: Colors.grey[300],
            borderRadius: BorderRadius.circular(30),
          ),
          child: const Icon(
            Icons.restaurant,
            size: 28,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'No image available',
          style: TextStyle(
            fontSize: 14,
            color: Colors.black45,
          ),
        ),
      ],
    );
  }

  Widget _buildBasicInformationSection() {
    return Container(
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
          _buildTextField('Ingredient Name', _nameController,
              hint: 'e.g. Whole Milk, Arabica Beans', enabled: _isEditMode),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildQuantityField(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField('Price', _priceController,
                    hint: '\$ 0.00',
                    enabled: _isEditMode,
                    keyboardType: TextInputType.number),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildDropdownField('Storage Type', _selectedStorage, _storageTypes),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildTextField('Weight', _weightController,
                    hint: '0.00',
                    enabled: _isEditMode,
                    keyboardType: TextInputType.number),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildDropdownField(
                    'Weight Unit', _selectedWeightUnit, _weightUnits),
              ),
            ],
          ),
          if (!_isEditMode) ...[
            const SizedBox(height: 16),
            _buildInfoRow('Unit', widget.ingredient.unitName ?? 'N/A'),
            const SizedBox(height: 8),
            _buildInfoRow(
                'Days Until Expiry', '${widget.ingredient.daysUntilExpiry} days'),
          ],
        ],
      ),
    );
  }

  Widget _buildInventoryDatesSection() {
    return Container(
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
          _buildDateField('Manufacture Date', _manufactureDate, Icons.factory,
              const Color(0xFF2196F3), const Color(0xFFE3F2FD), (date) {
            if (_isEditMode) {
              setState(() {
                _manufactureDate = date;
              });
            }
          }),
          const SizedBox(height: 12),
          _buildDateField('Expiry Date', _expiryDate, Icons.event_busy,
              const Color(0xFFF44336), const Color(0xFFFFEBEE), (date) {
            if (_isEditMode) {
              setState(() {
                _expiryDate = date;
              });
            }
          }),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller,
      {bool enabled = true,
      TextInputType? keyboardType,
      String hint = ''}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: Colors.black87,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          enabled: enabled,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
              color: Colors.black38,
              fontSize: 14,
            ),
            filled: true,
            fillColor: enabled ? Colors.white : Colors.grey[100],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFF2C2C54)),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuantityField() {
    return Column(
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
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
            color: _isEditMode ? Colors.white : Colors.grey[100],
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _quantityController,
                  enabled: _isEditMode,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  decoration: const InputDecoration(
                    hintText: '0.00',
                    hintStyle: TextStyle(
                      color: Colors.black38,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 14,
                    ),
                  ),
                ),
              ),
              if (_isEditMode)
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () {
                        double current =
                            double.tryParse(_quantityController.text) ?? 0.0;
                        _quantityController.text =
                            (current + 1.0).toStringAsFixed(2);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          border: Border(
                            left: BorderSide(color: Colors.grey.shade300),
                            bottom: BorderSide(color: Colors.grey.shade300),
                          ),
                        ),
                        child: const Icon(
                          Icons.keyboard_arrow_up,
                          size: 16,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        double current =
                            double.tryParse(_quantityController.text) ?? 0.0;
                        if (current > 0) {
                          _quantityController.text =
                              (current - 1.0).toStringAsFixed(2);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          border: Border(
                            left: BorderSide(color: Colors.grey.shade300),
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
    );
  }

  Widget _buildDropdownField(String label, String value, List<String> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
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
            color: _isEditMode ? Colors.white : Colors.grey[100],
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              icon: const Icon(Icons.arrow_drop_down),
              onChanged: _isEditMode
                  ? (String? newValue) {
                      setState(() {
                        if (label == 'Storage Type') {
                          _selectedStorage = newValue!;
                        } else if (label == 'Weight Unit') {
                          _selectedWeightUnit = newValue!;
                        }
                      });
                    }
                  : null,
              items: items.map<DropdownMenuItem<String>>((String item) {
                return DropdownMenuItem<String>(
                  value: item,
                  child: Text(
                    item,
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDateField(String label, DateTime date, IconData icon,
      Color iconColor, Color bgColor, Function(DateTime) onDateSelected) {
    return GestureDetector(
      onTap: _isEditMode
          ? () async {
              final DateTime? picked = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: ColorScheme.light(
                        primary: iconColor,
                      ),
                    ),
                    child: child!,
                  );
                },
              );
              if (picked != null) {
                onDateSelected(picked);
              }
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
          color: _isEditMode ? Colors.white : Colors.grey[50],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${_formatDate(date)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
            if (_isEditMode)
              Icon(Icons.calendar_today, color: Colors.grey[600], size: 20),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
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

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF2C2C54),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () {
              setState(() {
                _isEditMode = false;
                _initializeControllers(); // Reset to original values
              });
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: const BorderSide(color: Color(0xFF2C2C54)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2C2C54),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _saveChanges,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00C853),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Save Changes',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeleteButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _deleteIngredient,
        icon: const Icon(Icons.delete_outline),
        label: const Text(
          'Delete Ingredient',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
