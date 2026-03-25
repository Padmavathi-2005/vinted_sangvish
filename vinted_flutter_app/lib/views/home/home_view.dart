import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../controllers/home_controller.dart';
import '../../widgets/bottom_nav_bar.dart';
import 'sections/hero_section.dart';
import 'sections/category_section.dart';
import 'sections/product_section.dart';
import 'sections/banner_section.dart';
import '../../theme/app_colors.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HomeController>().initHome();
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<HomeController>();
    
    return Scaffold(
      appBar: AppBar(
        title: Image.network(
          controller.logoUrl,
          height: 30,
          errorBuilder: (context, error, stackTrace) => Text(
            controller.settings?.siteName ?? 'ReSale',
            style: TextStyle(color: controller.primaryColor),
          ),
        ),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.search)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.menu)),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      child: Column(
        children: [
          HomeHeroSection(),
          CategorySection(),
          ProductListingSection(),
          HomeBannerSection(),
        ],
      ),
    );
  }
}
