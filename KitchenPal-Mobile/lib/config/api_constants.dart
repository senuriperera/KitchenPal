class ApiConstants {
  static String _serverIp = '192.168.1.61';

  static String get baseUrl => 'http://$_serverIp:3000/api';

  static String get serverIp => _serverIp;

  static void setServerIp(String ip) {
    _serverIp = ip;
  }
}
