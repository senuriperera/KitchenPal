import 'package:flutter/material.dart';
import '../services/notification_bell_service.dart';
import '../services/websocket_service.dart';

class NotificationsDrawer extends StatefulWidget {
  const NotificationsDrawer({super.key});

  @override
  State<NotificationsDrawer> createState() => _NotificationsDrawerState();
}

class _NotificationsDrawerState extends State<NotificationsDrawer> {
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;
  Set<int> _readNotificationIds = {};

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _listenToNotificationChanges();
  }

  Future<void> _loadNotifications() async {
    try {
      final data = await NotificationBellService.getBellNotifications();
      print('Drawer notifications loaded: $data');
      setState(() {
        _notifications = List<Map<String, dynamic>>.from(data['notifications'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading drawer notifications: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _listenToNotificationChanges() {
    WebSocketService.instance.notificationsChanged.listen((_) {
      _loadNotifications();
    });
  }

  String _getTimeAgo(String createdAt) {
    final createdTime = DateTime.parse(createdAt);
    final now = DateTime.now();
    final difference = now.difference(createdTime);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  Color _getBorderColor(String notificationType) {
    if (notificationType == 'recipe_approved') {
      return const Color(0xFF16A34A);
    } else if (notificationType == 'recipe_rejected') {
      return const Color(0xFFE53935);
    } else if (notificationType == 'expiry_alert') {
      return const Color(0xFFFFA500); // Orange for expiry alerts
    }
    return Colors.grey;
  }

  Future<void> _markAsRead(int notificationId, int index) async {
    try {
      await NotificationBellService.markAsRead(notificationId);
      setState(() {
        _readNotificationIds.add(notificationId);
        _notifications[index]['is_read'] = true;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error marking notification as read: $e')),
        );
      }
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await NotificationBellService.markAllAsRead();
      setState(() {
        for (var notification in _notifications) {
          _readNotificationIds.add(notification['notification_id']);
          notification['is_read'] = true;
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error marking all as read: $e')),
        );
      }
    }
  }

  void _navigateToRecipes(String notificationType) {
    Navigator.pop(context);
    // Navigate based on notification type
    if (notificationType == 'expiry_alert') {
      // Navigate to inventory page to see expiring ingredients
      Navigator.pushNamed(context, '/inventory');
    } else {
      // Navigate to recipes page with generated tab (index 1)
      Navigator.pushNamed(context, '/recipes', arguments: {'tabIndex': 1});
    }
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF2E7D32),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Notifications',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: _markAllAsRead,
                  child: const Text(
                    'Mark all as read',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _notifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.notifications_none,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No notifications yet',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          final notification = _notifications[index];
                          final isRead = notification['is_read'] ?? false;
                          final notificationId = notification['notification_id'];

                          return Container(
                            color: isRead
                                ? Colors.white
                                : const Color(0xFFFFF3E0),
                            child: ListTile(
                              leading: Container(
                                width: 4,
                                color: _getBorderColor(
                                  notification['notification_type'],
                                ),
                              ),
                              title: Text(
                                notification['title'] ?? '',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(notification['message'] ?? ''),
                                  const SizedBox(height: 4),
                                  Text(
                                    _getTimeAgo(notification['created_at']),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                              onTap: () async {
                                if (!isRead) {
                                  await _markAsRead(notificationId, index);
                                }
                                _navigateToRecipes(
                                  notification['notification_type'],
                                );
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
