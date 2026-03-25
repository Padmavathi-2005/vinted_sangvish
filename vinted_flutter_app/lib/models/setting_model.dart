import 'package:flutter/material.dart';

class SettingModel {
  final String siteName;
  final String siteLogo;
  final Color primaryColor;
  final Color secondaryColor;

  SettingModel({
    required this.siteName,
    required this.siteLogo,
    required this.primaryColor,
    required this.secondaryColor,
  });

  factory SettingModel.fromJson(Map<String, dynamic> json) {
    return SettingModel(
      siteName: json['site_name']?.toString() ?? 'Vinted',
      siteLogo: json['site_logo'] ?? '',
      primaryColor: _parseColor(json['primary_color'], const Color(0xFF007782)),
      secondaryColor: _parseColor(json['secondary_color'], const Color(0xFF09B1BA)),
    );
  }

  static Color _parseColor(String? hexString, Color defaultColor) {
    if (hexString == null || hexString.isEmpty) return defaultColor;
    try {
      final buffer = StringBuffer();
      if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
      buffer.write(hexString.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (e) {
      return defaultColor;
    }
  }
}
