import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/ingredient.dart';
import '../models/ingredient_batch.dart';
import '../services/ingredient_service.dart';
import '../services/storage_service.dart';
import '../config/cloudinary_config.dart';
import 'login.dart';

class IngredientDetailPage extends StatefulWidget {
  final int ingredientId;

  const IngredientDetailPage({super.key, required this.ingredientId});

  @override
  State<IngredientDetailPage> createState() => _IngredientDetailPageState();
}

class _IngredientDetailPageState extends State<IngredientDetailPage> {
  Ingredient? _ingredient;
  bool _isLoading = true;
  bool _isDeleting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final ingredient = await IngredientService.getIngredientById(
        widget.ingredientId,
      );
      setState(() {
        _ingredient = ingredient;
        _isLoading = false;
      });
    } catch (e) {
      if (e.toString().contains('401')) {
        _handleUnauthorized();
        return;
      }
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteIngredient() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Ingredient'),
        content: Text('Are you sure you want to delete ${_ingredient?.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isDeleting = true);
      try {
        await IngredientService.deleteIngredient(widget.ingredientId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ingredient deleted successfully'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Failed to delete: $e')));
        }
      } finally {
        if (mounted) setState(() => _isDeleting = false);
      }
    }
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

  String _formatDate(DateTime? date) {
    if (date == null) return '—';
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

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('•  ', style: TextStyle(fontSize: 15, height: 1.5)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 15, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFF9500),
        foregroundColor: Colors.white,
        title: Text(_ingredient?.name ?? 'Ingredient Details'),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2C2C54)),
            )
          : _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load details',
                    style: TextStyle(fontSize: 18, color: Colors.grey[700]),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _loadDetail,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2C2C54),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            )
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    final i = _ingredient!;
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildImageSection(i),
              const SizedBox(height: 24),
              _buildStockSummaryCard(i),
              const SizedBox(height: 24),
              _buildInfoSection(i),
              const SizedBox(height: 24),
              _buildDatesSection(i),
              const SizedBox(height: 24),
              _buildBatchesSection(i.batches, i.baseUnitCode),
              const SizedBox(height: 24),
              _buildDeleteButton(),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Image ───────────────────────────────────────────────────────────────────
  Widget _buildImageSection(Ingredient i) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'INGREDIENT IMAGE',
          style: TextStyle(
            fontSize: 12,
            color: Colors.black54,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          height: 180,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300, width: 2),
          ),
          child: (i.imageUrl != null && i.imageUrl!.isNotEmpty)
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    i.imageUrl!,
                    width: double.infinity,
                    height: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholderImage(),
                  ),
                )
              : _buildPlaceholderImage(),
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
          child: const Icon(Icons.restaurant, size: 28, color: Colors.grey),
        ),
        const SizedBox(height: 12),
        const Text(
          'No image available',
          style: TextStyle(fontSize: 14, color: Colors.black45),
        ),
      ],
    );
  }

  // ─── Stock Summary Card ───────────────────────────────────────────────────
  Widget _buildStockSummaryCard(Ingredient i) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFB84D),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Total Stock (all batches combined)',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white70,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  i.displayTotalWeight,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'Quantity in stock',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white70,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${i.quantityInStock.toInt()} item(s)',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Info section ─────────────────────────────────────────────────────────
  Widget _buildInfoSection(Ingredient i) {
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
          _infoRow(Icons.label_outline, 'Ingredient Name', i.name),
          _divider(),
          _infoRow(
            Icons.scale_outlined,
            'Weight per Packet',
            '${i.unitWeight} ${i.unitWeightUnitCode}',
          ),
          _divider(),
          _infoRow(
            Icons.attach_money,
            'Price per Packet',
            '\Rs ${i.price.toStringAsFixed(2)}',
          ),
          _divider(),
          _infoRow(Icons.storage_outlined, 'Storage Type', i.storageTypeName),
          if (i.addedByName != null) ...[
            _divider(),
            _infoRow(Icons.person_outline, 'Added By', i.addedByName!),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF2C2C54)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() => Divider(height: 1, color: Colors.grey.shade100);

  // ─── Dates section ────────────────────────────────────────────────────────
  Widget _buildDatesSection(Ingredient i) {
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
          _buildDateTile(
            icon: Icons.factory,
            iconColor: const Color(0xFF2196F3),
            bgColor: const Color(0xFFE3F2FD),
            label: 'Manufacture Date',
            value: _formatDate(i.manufactureDate),
          ),
          const SizedBox(height: 12),
          _buildDateTile(
            icon: Icons.event_busy,
            iconColor: Colors.red,
            bgColor: const Color(0xFFFFEBEE),
            label: 'Expiry Date',
            value: _formatDate(i.expiryDate),
            isExpirySoon: i.isExpired || i.daysUntilExpiry <= 3,
            isExpired: i.isExpired,
          ),
        ],
      ),
    );
  }

  Widget _buildDateTile({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String label,
    required String value,
    bool isExpirySoon = false,
    bool isExpired = false,
  }) {
    final displayValue = isExpired ? 'Expired' : value;
    final textColor = isExpirySoon ? Colors.red : Colors.black87;
    final badgeText = isExpired ? 'Expired' : 'Expiring Soon';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(
          color: isExpirySoon ? Colors.red.shade200 : Colors.grey.shade300,
        ),
        borderRadius: BorderRadius.circular(8),
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
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 2),
                Text(
                  displayValue,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
          if (isExpirySoon)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                badgeText,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ─── Batches section ──────────────────────────────────────────────────────
  Widget _buildBatchesSection(
    List<IngredientBatch> batches,
    String baseUnitCode,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'ACTIVE BATCH STOCK',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.black54,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Row(
                        children: [
                          const Icon(
                            Icons.info_outline,
                            color: Color(0xFF2C2C54),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: const Text('Active Batch Stock')),
                        ],
                      ),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'This section shows all your stock batches for this ingredient.',
                            style: TextStyle(fontSize: 15, height: 1.5),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Each time you add stock, it creates a separate batch. The batches are numbered in order of which should be used first (oldest first) to avoid waste.',
                            style: TextStyle(fontSize: 15, height: 1.5),
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: const Text('Got it'),
                        ),
                      ],
                    ),
                  );
                },
                child: const Icon(
                  Icons.help_outline,
                  size: 16,
                  color: Color(0xFF2C2C54),
                ),
              ),
              const Spacer(),
              Text(
                '${batches.length} batch(es)',
                style: const TextStyle(fontSize: 12, color: Colors.black45),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (batches.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'No active batches',
                style: TextStyle(color: Colors.black45, fontSize: 14),
              ),
            )
          else
            ...batches.asMap().entries.map((entry) {
              final idx = entry.key;
              final batch = entry.value;
              final now = DateTime.now();
              final today = DateTime(now.year, now.month, now.day);
              final bExpiry = DateTime(
                batch.expiryDate.year,
                batch.expiryDate.month,
                batch.expiryDate.day,
              );
              final daysLeft = bExpiry.difference(today).inDays;
              final isBatchExpired = daysLeft < 0;

              // Format the remaining quantity nicely
              String formattedQty;
              if (batch.remainingBaseQuantity.isNaN ||
                  batch.remainingBaseQuantity.isInfinite) {
                formattedQty = '0 ${batch.baseUnitCode}';
              } else {
                final qty = batch.remainingBaseQuantity.toStringAsFixed(0);
                formattedQty = '$qty ${batch.baseUnitCode}';
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9F9F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: daysLeft <= 3
                        ? Colors.red.shade200
                        : Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2C2C54),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Text(
                          '${idx + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$formattedQty remaining',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Expires: ${_formatDate(batch.expiryDate)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: daysLeft <= 3
                                  ? Colors.red
                                  : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (daysLeft <= 3)
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: Colors.red,
                        size: 20,
                      ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  // ─── Delete button ────────────────────────────────────────────────────────
  Widget _buildDeleteButton() {
    return OutlinedButton.icon(
      onPressed: _isDeleting ? null : _deleteIngredient,
      icon: _isDeleting
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.red,
              ),
            )
          : const Icon(Icons.delete_outline, color: Colors.red),
      label: const Text(
        'Delete Ingredient',
        style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 12),
        side: const BorderSide(color: Colors.red),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
