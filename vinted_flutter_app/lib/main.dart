import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'controllers/home_controller.dart';
import 'views/home/home_view.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => HomeController()),
      ],
      child: const VintedApp(),
    ),
  );
}

class VintedApp extends StatelessWidget {
  const VintedApp({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<HomeController>();
    
    return MaterialApp(
      title: 'Vinted App',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getTheme(controller.primaryColor),
      home: const HomeView(),
    );
  }
}
