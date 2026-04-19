import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../config/api_constants.dart';
import 'storage_service.dart';

/// Singleton service to manage Socket.IO connection and broadcast
/// high-level events to the rest of the app.
class WebSocketService {
  WebSocketService._internal();

  static final WebSocketService _instance = WebSocketService._internal();
  static WebSocketService get instance => _instance;

  IO.Socket? _socket;

  final StreamController<void> _inventoryChangedController =
      StreamController<void>.broadcast();

  final StreamController<void> _notificationsChangedController =
      StreamController<void>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeGeneratedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeApprovedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeRejectedController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Emitted whenever the backend signals that inventory changed
  /// (ingredient created/deleted, expiry-related updates, etc.).
  Stream<void> get inventoryChanged => _inventoryChangedController.stream;

  /// Emitted whenever the backend signals that notifications changed
  /// (recipe approved/rejected notifications).
  Stream<void> get notificationsChanged =>
      _notificationsChangedController.stream;

  /// Emitted when a recipe is generated
  Stream<Map<String, dynamic>> get recipeGenerated =>
      _recipeGeneratedController.stream;

  /// Emitted when a recipe is approved
  Stream<Map<String, dynamic>> get recipeApproved =>
      _recipeApprovedController.stream;

  /// Emitted when a recipe is rejected
  Stream<Map<String, dynamic>> get recipeRejected =>
      _recipeRejectedController.stream;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) {
      return;
    }

    final token = await StorageService.getToken();

    // Derive base server URL (without /api) from ApiConstants.baseUrl
    final apiUri = Uri.parse(ApiConstants.baseUrl);
    final socketUrl = '${apiUri.scheme}://${apiUri.host}:${apiUri.port}';

    final socket = IO.io(
      socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setExtraHeaders(
            token != null ? {'Authorization': 'Bearer $token'} : {},
          )
          .build(),
    );

    socket.onConnect((_) {
      // Connected successfully
    });

    // Inventory changes (ingredients + expiry-related flows)
    socket.on('inventory:changed', (data) {
      _inventoryChangedController.add(null);
    });

    // Notifications changed (recipe approved/rejected)
    socket.on('notifications:changed', (_) {
      _notificationsChangedController.add(null);
    });

    // Recipe generated event
    socket.on('recipe:generated', (data) {
      _recipeGeneratedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Recipe approved event
    socket.on('recipe:approved', (data) {
      _recipeApprovedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Recipe rejected event
    socket.on('recipe:rejected', (data) {
      _recipeRejectedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    socket.onDisconnect((_) {
      // Disconnected
    });

    _socket = socket;
    socket.connect();
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _inventoryChangedController.close();
    _notificationsChangedController.close();
    _recipeGeneratedController.close();
    _recipeApprovedController.close();
    _recipeRejectedController.close();
  }
}
