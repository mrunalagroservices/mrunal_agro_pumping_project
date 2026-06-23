import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Thrown when the server returns 401 — caller should log the user out.
class UnauthorizedException extends ApiException {
  UnauthorizedException() : super('Session expired, please log in again', statusCode: 401);
}

class ApiClient {
  static const _tokenKey = 'pumping_auth_token';

  String? _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  bool get hasToken => _token != null;

  String? get token => _token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<dynamic> _handleResponse(http.Response res) {
    Map<String, dynamic> body = {};
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {}

    if (res.statusCode == 401) {
      // Only an actual expired/invalid session if we sent a token. A 401 on a
      // request with no token (e.g. login with the wrong password) is a plain
      // credential failure — surface the server's real message instead of the
      // generic "session expired" one.
      if (_token != null) {
        throw UnauthorizedException();
      }
      throw ApiException(
        body['message'] as String? ?? 'Invalid email or password',
        statusCode: 401,
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(
        body['message'] as String? ?? 'Request failed (${res.statusCode})',
        statusCode: res.statusCode,
      );
    }
    return Future.value(body['data']);
  }

  Future<dynamic> get(String path) async {
    final res = await http
        .get(Uri.parse('$apiBaseUrl$path'), headers: _headers)
        .timeout(const Duration(seconds: 60));
    return _handleResponse(res);
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .post(
          Uri.parse('$apiBaseUrl$path'),
          headers: _headers,
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(const Duration(seconds: 60));
    return _handleResponse(res);
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .put(
          Uri.parse('$apiBaseUrl$path'),
          headers: _headers,
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(const Duration(seconds: 60));
    return _handleResponse(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await http
        .delete(Uri.parse('$apiBaseUrl$path'), headers: _headers)
        .timeout(const Duration(seconds: 60));
    return _handleResponse(res);
  }
}
