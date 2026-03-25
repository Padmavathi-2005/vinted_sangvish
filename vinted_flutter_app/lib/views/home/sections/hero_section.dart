import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../controllers/home_controller.dart';
import '../../../utils/app_constants.dart';
import '../../../theme/app_colors.dart';

class HomeHeroSection extends StatelessWidget {
  const HomeHeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<HomeController>();
    
    // Get dynamic content from backend
    final String heroTitle = controller.getHomeText('home.hero_title', 'Buy & sell everything from cars to couches.');
    final String heroSubtitle = controller.getHomeText('home.hero_subtitle', 'Join millions of neighbors finding great deals on pre-owned items.');
    final String heroImage = controller.getHomeText('home.hero_image', '');
    final String heroBadge = controller.getHomeText('home.hero_badge', 'LOCAL CLOTHING MARKETPLACE');
    final String statRatingValue = controller.getHomeText('home.stat_rating_value', '4.8/5');
    final String statRatingLabel = controller.getHomeText('home.stat_rating_label', 'Live User Rating');
    final String statSellersValue = controller.getHomeText('home.stat_sellers_value', '5M+');
    final String statSellersLabel = controller.getHomeText('home.stat_sellers_label', 'Happy Sellers');

    // Split title logic if needed
    final List<String> titleParts = heroTitle.contains('from') ? heroTitle.split('from') : [heroTitle, ''];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.black,
        image: heroImage.isNotEmpty ? DecorationImage(
          image: NetworkImage(AppConstants.getImageUrl(heroImage)),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.6), BlendMode.darken),
        ) : null,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white70, width: 1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              heroBadge.toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 20),
          RichText(
            text: TextSpan(
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
                height: 1.2,
              ),
              children: [
                TextSpan(text: titleParts[0].trim()),
                if (titleParts.length > 1 && titleParts[1].isNotEmpty)
                  TextSpan(
                    text: '\nfrom ${titleParts[1].trim()}',
                    style: TextStyle(color: controller.primaryColor),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 15),
          Text(
            heroSubtitle,
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 30),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: controller.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Start Selling', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Explore More', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
          Row(
            children: [
              _buildStat(Icons.star, statRatingValue, statRatingLabel, controller.primaryColor),
              const SizedBox(width: 40),
              _buildStat(Icons.people, statSellersValue, statSellersLabel, controller.primaryColor),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStat(IconData icon, String value, String label, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
          ],
        )
      ],
    );
  }
}
