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

  /// Emitted whenever the backend signals that inventory changed
  /// (ingredient created/deleted, expiry-related updates, etc.).
  Stream<void> get inventoryChanged => _inventoryChangedController.stream;

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

    // Notifications are currently surfaced to the mobile app
    // via expiring-ingredients; if you later add a real
    // notifications UI, you can add another StreamController
    // and listen to 'notifications:changed' here.

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
  }
}
