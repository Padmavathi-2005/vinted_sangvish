import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../controllers/home_controller.dart';
import '../../../theme/app_colors.dart';
import '../../../widgets/product_card.dart';

class ProductListingSection extends StatefulWidget {
  const ProductListingSection({super.key});

  @override
  State<ProductListingSection> createState() => _ProductListingSectionState();
}

class _ProductListingSectionState extends State<ProductListingSection> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: AppColors.primary,
            indicatorSize: TabBarIndicatorSize.tab,
            labelPadding: const EdgeInsets.only(bottom: 15),
            labelStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            tabs: const [
              Text('Popular Items'),
              Text('Newest Listings'),
            ],
          ),
          const SizedBox(height: 20),
          _buildProductGrid(),
          const SizedBox(height: 30),
          Center(
            child: OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(200, 50),
                side: const BorderSide(color: Colors.blueAccent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('See More', style: TextStyle(color: Colors.blueAccent)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildProductGrid() {
    final controller = context.watch<HomeController>();
    
    if (controller.items.isEmpty) {
      return GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        itemCount: 4,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 15,
          mainAxisSpacing: 15,
          childAspectRatio: 0.65,
        ),
        itemBuilder: (context, index) => const ProductCardMock(),
      );
    }

    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: controller.items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 15,
        mainAxisSpacing: 15,
        childAspectRatio: 0.65,
      ),
      itemBuilder: (context, index) {
        return ProductCard(product: controller.items[index]);
      },
    );
  }
}

class ProductCardMock extends StatelessWidget {
  const ProductCardMock({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                'https://m.media-amazon.com/images/I/71Yf0N2o5KL._AC_UY1100_.jpg',
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text('TOP RATED', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: Icon(Icons.favorite_outline, color: Colors.white.withOpacity(0.8)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const Text(
          'Iphone 13 pro - 256GB - Graphite',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontWeight: FontWeight.w500, fontSize: 15, height: 1.2),
        ),
        const SizedBox(height: 5),
        const Text(
          '₹44,158.42',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black),
        ),
        const SizedBox(height: 5),
        Row(
          children: [
            const Icon(Icons.access_time_outlined, color: Colors.grey, size: 14),
            const SizedBox(width: 4),
            const Text('10 days ago', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        )
      ],
    );
  }
}
