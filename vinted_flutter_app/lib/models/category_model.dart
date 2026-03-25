class CategoryModel {
  final String id;
  final String name;
  final String? image;
  final String? slug;

  CategoryModel({
    required this.id,
    required this.name,
    this.image,
    this.slug,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      image: json['image'],
      slug: json['slug'],
    );
  }
}
