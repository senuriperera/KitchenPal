import 'package:flutter/material.dart';
import '../shared/bottom_navbar.dart';
import 'home_page.dart';

class AddIngredientPage extends StatefulWidget {
  const AddIngredientPage({super.key});

  @override
  State<AddIngredientPage> createState() => _AddIngredientPageState();
}

class _AddIngredientPageState extends State<AddIngredientPage> {
  int _currentIndex = 2; // Index for Add Ingredient
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _quantityController = TextEditingController();
  final _weightController = TextEditingController();
  final _priceController = TextEditingController();
  final _dateController = TextEditingController();
  
  String _selectedUnit = 'kg';
  String _selectedStorage = 'Fridge';
  
  final List<String> _units = ['kg', 'g', 'L', 'ml', 'pcs'];
  final List<String> _storageTypes = ['Fridge', 'Freezer', 'Pantry'];

  void _handleNavTap(int index) {
    if (index == 0) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HomePage()),
      );
    } else if (index != 2) {
      // For now only Home and Add are connected. 
      // Other indices could be implemented similarly.
      setState(() {
        _currentIndex = index;
      });
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2101),
    );
    if (picked != null) {
      setState(() {
        _dateController.text = "${picked.month}/${picked.day}/${picked.year}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('9:41', style: TextStyle(color: Colors.black, fontSize: 14)), 
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        automaticallyImplyLeading: false, // Hide back button as we use navbar
        actions: [
           IconButton(
             icon: const Icon(Icons.battery_full, color: Colors.black), 
             onPressed: () {},
           ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Image Placeholder
                Container(
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.grey.shade400),
                  ),
                  child: Center(
                    child: Icon(Icons.image_outlined, size: 48, color: Colors.grey.shade500),
                  ),
                ),
                const SizedBox(height: 24),

                // Ingredient Name
                _buildLabel('Ingredient Name'),
                _buildTextField(controller: _nameController),
                const SizedBox(height: 16),

                // Quantity, Weight, Unit
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Quantity'),
                          _buildTextField(controller: _quantityController),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Weight'),
                          _buildTextField(controller: _weightController),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                     Expanded(
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Unit'),
                          _buildDropdown(
                            value: _selectedUnit, 
                            items: _units, 
                            onChanged: (val) => setState(() => _selectedUnit = val!),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Price
                _buildLabel('Price'),
                _buildTextField(controller: _priceController),
                const SizedBox(height: 16),

                // Expire Date
                _buildLabel('Expire Date'),
                GestureDetector(
                  onTap: () => _selectDate(context),
                  child: AbsorbPointer(
                    child: TextField(
                      controller: _dateController,
                      decoration: InputDecoration(
                        hintText: 'MM / DD / YYYY',
                        suffixIcon: const Icon(Icons.calendar_today_outlined),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF79747E)),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Storage Type
                _buildLabel('Storage Type'),
                _buildDropdown(
                  value: _selectedStorage, 
                  items: _storageTypes, 
                  onChanged: (val) => setState(() => _selectedStorage = val!),
                  isFullWidth: true,
                ),
                const SizedBox(height: 32),

                // Add Button
                ElevatedButton(
                  onPressed: () {
                    // Start verification or backend logic
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Ingredient Added! (Mock)')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    elevation: 0,
                  ),
                  child: const Text('Add', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: KitchenPalBottomNavBar(
        currentIndex: _currentIndex,
        onTap: _handleNavTap,
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black),
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller}) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF79747E)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF79747E)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  Widget _buildDropdown({
    required String value, 
    required List<String> items, 
    required ValueChanged<String?> onChanged,
    bool isFullWidth = false,
  }) {
    return Container(
      height: 50, // Match text field height roughly
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF79747E)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true, 
          icon: const Icon(Icons.unfold_more),
          onChanged: onChanged,
          items: items.map<DropdownMenuItem<String>>((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
        ),
      ),
    );
  }
}
