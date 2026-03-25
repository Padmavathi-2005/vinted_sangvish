class AppConstants {
  static const String baseUrl = 'https://vinted.sangvish.com';
  static const String apiBaseUrl = '$baseUrl/api';

  static String getImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return 'https://via.placeholder.com/300?text=No+Image';
    }
    if (path.startsWith('http')) {
      return path;
    }
    final cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return '$baseUrl/$cleanPath';
  }
}
