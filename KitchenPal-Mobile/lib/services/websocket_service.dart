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
  bool _handlersRegistered = false;

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

  final StreamController<Map<String, dynamic>> _recipeCreatedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeDeletedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _recipeDeactivatedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<Map<String, dynamic>> _analyticsUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Emitted whenever the backend signals that analytics changed
  Stream<Map<String, dynamic>> get analyticsUpdated =>
      _analyticsUpdatedController.stream;

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

  /// Emitted when a standard recipe is created
  Stream<Map<String, dynamic>> get recipeCreated =>
      _recipeCreatedController.stream;

  /// Emitted when a standard recipe is updated
  Stream<Map<String, dynamic>> get recipeUpdated =>
      _recipeUpdatedController.stream;

  /// Emitted when a standard recipe is deleted
  Stream<Map<String, dynamic>> get recipeDeleted =>
      _recipeDeletedController.stream;

  /// Emitted when a generated recipe is deactivated due to depleted ingredients
  Stream<Map<String, dynamic>> get recipeDeactivated =>
      _recipeDeactivatedController.stream;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect() async {
    print('=== [WebSocketService.connect()] CALLED ===');
    if (_socket != null && _socket!.connected) {
      print('[WS] Already connected, skipping');
      return;
    }

    final token = await StorageService.getToken();
    print(
      '[WS] Token obtained: ${token != null ? token.substring(0, 20) + '...' : 'null'}',
    );

    // Derive base server URL (without /api) from ApiConstants.baseUrl
    final apiUri = Uri.parse(ApiConstants.baseUrl);
    final socketUrl = '${apiUri.scheme}://${apiUri.host}:${apiUri.port}';
    print('[WS] Connecting to: $socketUrl');

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
      print('[WS] Connected! Socket ID: ${socket.id}');
    });

    socket.onConnectError((data) {
      print('[WS] Connect error: $data');
    });

    socket.onError((data) {
      print('[WS] Error: $data');
    });

    socket.onDisconnect((_) {
      print('[WS] Disconnected');
    });

    _socket = socket;
    print('[WS] Calling socket.connect()...');
    socket.connect();
    print('[WS] connect() called, waiting for onConnect callback...');

    // Register socket event handlers only once
    if (!_handlersRegistered) {
      print('[WS] Registering socket event handlers (ONCE)');
      _registerHandlers(socket);
      _handlersRegistered = true;
    } else {
      print('[WS] Socket handlers already registered, skipping');
    }
  }

  void _registerHandlers(IO.Socket socket) {
    // Inventory changes (ingredients + expiry-related flows)
    socket.on('inventory:changed', (data) {
      print('[WS] Received: inventory:changed');
      _inventoryChangedController.add(null);
    });

    // Notifications changed (recipe approved/rejected)
    socket.on('notifications:changed', (_) {
      print('[WS] Received: notifications:changed');
      _notificationsChangedController.add(null);
    });

    // Recipe generated event
    socket.on('recipe:generated', (data) {
      print('[WS] Received: recipe:generated');
      _recipeGeneratedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Recipe approved event
    socket.on('recipe:approved', (data) {
      print('[WS] Received: recipe:approved');
      _recipeApprovedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Recipe rejected event
    socket.on('recipe:rejected', (data) {
      print('[WS] Received: recipe:rejected');
      _recipeRejectedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Standard recipe created event
    socket.on('recipe:created', (data) {
      print('[WS] socket.on(recipe:created) FIRED with data: $data');
      _recipeCreatedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Standard recipe updated event
    socket.on('recipe:updated', (data) {
      print('[WS] socket.on(recipe:updated) FIRED with data: $data');
      _recipeUpdatedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Standard recipe deleted event
    socket.on('recipe:deleted', (data) {
      print('[WS] socket.on(recipe:deleted) FIRED with data: $data');
      _recipeDeletedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Generated recipe deactivated event (ingredients depleted)
    socket.on('recipe:deactivated', (data) {
      print('[WS] Received: recipe:deactivated');
      _recipeDeactivatedController.add(Map<String, dynamic>.from(data ?? {}));
    });

    // Analytics updated event
    socket.on('analytics:updated', (data) {
      print('[WS] Received: analytics:updated');
      _analyticsUpdatedController.add(Map<String, dynamic>.from(data ?? {}));
    });
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _inventoryChangedController.close();
    _notificationsChangedController.close();
    _recipeGeneratedController.close();
    _recipeApprovedController.close();
    _recipeRejectedController.close();
    _recipeCreatedController.close();
    _recipeUpdatedController.close();
    _recipeDeletedController.close();
    _recipeDeactivatedController.close();
    _analyticsUpdatedController.close();
  }
}
