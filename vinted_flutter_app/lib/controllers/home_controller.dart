import 'package:flutter/material.dart';
import '../models/item_model.dart';
import '../models/category_model.dart';
import '../models/setting_model.dart';
import '../services/api_service.dart';
import '../utils/app_constants.dart';

class HomeController extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<ItemModel> items = [];
  List<CategoryModel> categories = [];
  SettingModel? settings;
  Map<String, dynamic> homeContent = {};
  
  bool isLoading = false;
  String errorMessage = '';

  Future<void> initHome() async {
    isLoading = true;
    notifyListeners();
    try {
      final results = await Future.wait([
        _apiService.get('/items'),
        _apiService.get('/categories'),
        _apiService.get('/settings/site_settings'),
        _apiService.get('/frontend-content/en') // Fetch home section content
      ]);
      
      final List<dynamic> itemsJson = results[0];
      final List<dynamic> catsJson = results[1];
      final Map<String, dynamic> settingsJson = results[2];
      final Map<String, dynamic> contentJson = results[3];
      
      items = itemsJson.map((j) => ItemModel.fromJson(j)).toList();
      categories = catsJson.map((j) => CategoryModel.fromJson(j)).toList();
      settings = SettingModel.fromJson(settingsJson);
      
      // Extract 'home' section from the content response
      homeContent = contentJson['home'] ?? {};
      
      errorMessage = '';
    } catch (e) {
      errorMessage = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // helper to get translated text from homeContent
  String getHomeText(String key, String defaultValue) {
    return homeContent[key]?.toString() ?? defaultValue;
  }

  // Get color from settings or fallback to default
  Color get primaryColor => settings?.primaryColor ?? const Color(0xFF007782);
  String get logoUrl => AppConstants.getImageUrl(settings?.siteLogo);
}
