class ItemModel {
  final String id;
  final String title;
  final String description;
  final double price;
  final List<String> images;
  final String category;
  final String user;

  ItemModel({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.images,
    required this.category,
    required this.user,
  });

  factory ItemModel.fromJson(Map<String, dynamic> json) {
    return ItemModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      images: (json['images'] as List?)?.map((i) => i.toString()).toList() ?? [],
      category: json['category'] is Map ? json['category']['name'] : json['category']?.toString() ?? '',
      user: json['user']?.toString() ?? '',
    );
  }
}
