import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../services/auth_service.dart';
import '../services/ingredient_service.dart';
import '../services/storage_service.dart';
import '../models/ingredient.dart';
import '../services/websocket_service.dart';
import '../services/notification_bell_service.dart';
import 'login.dart';

// Main HomePage wrapper for backward compatibility
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: HomePageContent(),
    );
  }
}

// Extracted content widget for use in MainContainer
class HomePageContent extends StatefulWidget {
  final Function(int)? onNavigate;

  const HomePageContent({super.key, this.onNavigate});

  @override
  State<HomePageContent> createState() => _HomePageContentState();
}

class _HomePageContentState extends State<HomePageContent> {
  List<Ingredient> _expiringIngredients = [];
  bool _isLoading = true;
  String _userName = 'User';
  int _unreadNotificationCount = 0;

  @override
  void initState() {
    super.initState();
    _loadExpiringIngredients();
    _loadUserName();
    _loadNotificationCount();

    // Connect to WebSocket and refresh nearing-expiry section
    WebSocketService.instance.connect();
    WebSocketService.instance.inventoryChanged.listen((_) {
      _loadExpiringIngredients();
    });

    // Listen for notification changes
    WebSocketService.instance.notificationsChanged.listen((_) {
      _loadNotificationCount();
    });
  }

  Future<void> _loadUserName() async {
    final storedName = await StorageService.getUserName();
    var resolvedName = (storedName ?? '').trim();

    if (resolvedName.isEmpty) {
      final currentUser = await AuthService.getCurrentUser();
      resolvedName = _extractLoggedInUserName(currentUser);
    }

    if (!mounted) return;

    setState(() {
      _userName = resolvedName.isNotEmpty ? resolvedName : 'User';
    });
  }

  String _extractLoggedInUserName(Map<String, dynamic>? userPayload) {
    if (userPayload == null) return '';

    final directName = (userPayload['name'] as String?)?.trim() ?? '';
    if (directName.isNotEmpty) return directName;

    final nestedUser = userPayload['user'];
    if (nestedUser is Map<String, dynamic>) {
      return (nestedUser['name'] as String?)?.trim() ?? '';
    }

    return '';
  }

  Future<void> _loadExpiringIngredients() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // branch_id is now in JWT — no param needed
      final ingredients = await IngredientService.getExpiringIngredients(
        days: 7,
      );

      setState(() {
        _expiringIngredients = ingredients
            .take(3)
            .toList(); // Show only first 3
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadNotificationCount() async {
    try {
      final data = await NotificationBellService.getBellNotifications();
      print('Notifications loaded: $data');
      setState(() {
        _unreadNotificationCount = data['unread_count'] ?? 0;
      });
    } catch (e) {
      print('Error loading notifications: $e');
      // Silent fail
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 16),
              _buildWasteSummaryCard(),
              const SizedBox(height: 20),
              _buildNearingExpiryHeader(),
              const SizedBox(height: 12),
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _expiringIngredients.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32.0),
                        child: Text(
                          'No items nearing expiry',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ),
                    )
                  : Column(
                      children: _expiringIngredients.map((ingredient) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildExpiryItemFromData(ingredient),
                        );
                      }).toList(),
                    ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showLogoutDialog() async {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to log out?'),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text('Logout', style: TextStyle(color: Colors.red)),
              onPressed: () async {
                Navigator.of(context).pop(); // Close dialog
                await AuthService.logout();
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (context) => const LoginPage()),
                    (route) => false,
                  );
                }
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        GestureDetector(
          onTap: _showLogoutDialog,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFFFE0B2),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.person, size: 28, color: Color(0xFFFF9800)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Hello there,',
                style: TextStyle(fontSize: 14, color: Colors.black54),
              ),
              Text(
                _userName,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined, size: 28),
              onPressed: () {
                Scaffold.of(context).openEndDrawer();
              },
            ),
            if (_unreadNotificationCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      _unreadNotificationCount > 99
                          ? '99+'
                          : _unreadNotificationCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildWasteSummaryCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Flexible(
                child: Text(
                  'October Waste Summary',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F5F5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'View Report',
                  style: TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text(
                '75% ',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const Text(
                'Saved',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF00C853),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 110,
                height: 110,
                child: CustomPaint(
                  painter: CircularProgressPainter(percentage: 75),
                  child: Center(
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(
                        Icons.eco,
                        color: Color(0xFF00C853),
                        size: 22,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Color(0xFF00C853),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Saved Food',
                          style: TextStyle(fontSize: 13),
                        ),
                        const Spacer(),
                        const Text(
                          '420 kg',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('Wasted', style: TextStyle(fontSize: 13)),
                        const Spacer(),
                        const Text(
                          '140 kg',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Total saved value: \$1,250',
                      style: TextStyle(fontSize: 12, color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNearingExpiryHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Nearing Expiry',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        TextButton(
          onPressed: () {
            // Navigate to notifications page (index 4)
            if (widget.onNavigate != null) {
              widget.onNavigate!(4);
            }
          },
          child: Row(
            children: const [
              Text(
                'View All',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF00C853),
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(width: 4),
              Icon(Icons.arrow_forward, size: 16, color: Color(0xFF00C853)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildExpiryItem(
    String name,
    String details,
    String expiry,
    String imageUrl, {
    bool isUrgent = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isUrgent)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    margin: const EdgeInsets.only(bottom: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.access_time, size: 12, color: Colors.red),
                        SizedBox(width: 4),
                        Text(
                          'Expires Tomorrow',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.red,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    margin: const EdgeInsets.only(bottom: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 12,
                          color: Color(0xFFFF9800),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          expiry,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFFFF9800),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  details,
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 10),
                Center(
                  child: SizedBox(
                    width: 200,
                    child: ElevatedButton(
                      onPressed: () {
                        // Navigate to notifications page (index 4)
                        if (widget.onNavigate != null) {
                          widget.onNavigate!(4);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.restaurant_menu, size: 14),
                          SizedBox(width: 4),
                          Text(
                            'Generate Recipe',
                            style: TextStyle(fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 85,
              height: 85,
              color: Colors.grey.shade200,
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: const Color(0xFFFFE0B2),
                    child: const Icon(
                      Icons.image,
                      size: 35,
                      color: Colors.grey,
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpiryItemFromData(Ingredient ingredient) {
    final daysUntilExpiry = ingredient.daysUntilExpiry;
    final isUrgent = daysUntilExpiry <= 1;

    String expiryText;
    if (daysUntilExpiry == 0) {
      expiryText = 'Expires Today';
    } else if (daysUntilExpiry == 1) {
      expiryText = 'Expires Tomorrow';
    } else {
      expiryText = 'Exp: $daysUntilExpiry Days';
    }

    // Format the quantity display using total_base_quantity
    final qty = ingredient.totalBaseQuantity;
    final qtyStr = qty == qty.roundToDouble()
        ? qty.toInt().toString()
        : qty.toStringAsFixed(1);

    return _buildExpiryItem(
      ingredient.name,
      '$qtyStr ${ingredient.baseUnitCode} • ${ingredient.storageTypeName}',
      expiryText,
      ingredient.imageUrl ?? '',
      isUrgent: isUrgent,
    );
  }
}

class CircularProgressPainter extends CustomPainter {
  final double percentage;

  CircularProgressPainter({required this.percentage});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // Background circle (gray)
    final backgroundPaint = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius - 5, backgroundPaint);

    // Progress arc (green)
    final progressPaint = Paint()
      ..color = const Color(0xFF00C853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * (percentage / 100);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - 5),
      -math.pi / 2,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => true;
}
