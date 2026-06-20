import 'package:flutter/material.dart';

/// Visual fallback (icon + colors) shown when a product has no image_url,
/// keyed by category since real products don't carry per-item icon styling.
class _CategoryStyle {
  final IconData icon;
  final Color color;
  final Color bg;
  const _CategoryStyle(this.icon, this.color, this.bg);
}

const Map<String, _CategoryStyle> _categoryStyles = {
  'Seeds': _CategoryStyle(Icons.eco_outlined, Color(0xFF16A34A), Color(0xFFDCFCE7)),
  'Fertilizers': _CategoryStyle(Icons.science_outlined, Color(0xFF0EA5E9), Color(0xFFE0F2FE)),
  'Irrigation': _CategoryStyle(Icons.water_drop_outlined, Color(0xFF0891B2), Color(0xFFCFFAFE)),
  'Tools': _CategoryStyle(Icons.agriculture_outlined, Color(0xFF78716C), Color(0xFFF5F5F4)),
  'Pesticides': _CategoryStyle(Icons.bug_report_outlined, Color(0xFFEA580C), Color(0xFFFFF7ED)),
};
const _defaultCategoryStyle = _CategoryStyle(Icons.layers_outlined, Color(0xFF374151), Color(0xFFF3F4F6));

_CategoryStyle _styleFor(String category) => _categoryStyles[category] ?? _defaultCategoryStyle;

/// Real product, backed by GET /api/v1/products. `rating`/`reviewCount` are
/// computed server-side from actual product_reviews where any exist, falling
/// back to the admin-seeded values otherwise.
class Product {
  final int id;
  final String name;
  final String description;
  final String category;
  final double price;
  final double originalPrice;
  final double rating;
  final int reviewCount;
  final String? imageUrl;
  final String unit;
  final bool isBestSeller;
  final int stockQuantity;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.price,
    required this.originalPrice,
    required this.rating,
    required this.reviewCount,
    this.imageUrl,
    required this.unit,
    this.isBestSeller = false,
    this.stockQuantity = 0,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'Others',
      price: double.tryParse('${json['price']}') ?? 0,
      originalPrice: double.tryParse('${json['original_price']}') ?? 0,
      rating: double.tryParse('${json['rating']}') ?? 0,
      reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
      imageUrl: json['image_url'] as String?,
      unit: json['unit'] as String? ?? '',
      isBestSeller: json['is_best_seller'] as bool? ?? false,
      stockQuantity: (json['stock_quantity'] as num?)?.toInt() ?? 0,
    );
  }

  int get discountPercent =>
      originalPrice > price ? ((originalPrice - price) / originalPrice * 100).round() : 0;

  bool get inStock => stockQuantity > 0;

  IconData get icon => _styleFor(category).icon;
  Color get iconColor => _styleFor(category).color;
  Color get iconBg => _styleFor(category).bg;
}

class ProductReview {
  final int id;
  final int rating;
  final String? comment;
  final String userName;
  final DateTime createdAt;

  ProductReview({
    required this.id,
    required this.rating,
    this.comment,
    required this.userName,
    required this.createdAt,
  });

  factory ProductReview.fromJson(Map<String, dynamic> json) {
    return ProductReview(
      id: json['id'] as int,
      rating: (json['rating'] as num).toInt(),
      comment: json['comment'] as String?,
      userName: json['user_name'] as String? ?? 'Anonymous',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
