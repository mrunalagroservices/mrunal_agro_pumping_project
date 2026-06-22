import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../l10n/tr_extension.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import 'cart_screen.dart';
import 'write_review_sheet.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class ProductDetailScreen extends StatefulWidget {
  final int productId;
  final String deliveryDate;
  final VoidCallback onAddToCart;
  final int cartQty;

  const ProductDetailScreen({
    super.key,
    required this.productId,
    required this.deliveryDate,
    required this.onAddToCart,
    required this.cartQty,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  List<ProductReview> _reviews = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final state = context.read<AppState>();
      final results = await Future.wait([
        state.fetchProduct(widget.productId),
        state.fetchReviews(widget.productId),
      ]);
      if (!mounted) return;
      setState(() {
        _product = results[0] as Product;
        _reviews = results[1] as List<ProductReview>;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() { _loading = false; _error = context.tr('product_load_error'); });
    }
  }

  Future<void> _writeReview() async {
    final p = _product;
    if (p == null) return;
    final result = await showWriteReviewSheet(context, productId: p.id, productName: p.name);
    if (result == true) _load();
  }

  void _buyNow() {
    final p = _product;
    if (p == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartScreen(
          cart: {p.id: 1},
          products: [p],
          onUpdate: (_, __) {},
          onOrderPlaced: () {},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final p = _product;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null || p == null
                ? _ErrorView(message: _error ?? context.tr('product_not_found'), onRetry: _load)
                : Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                        child: Row(
                          children: [
                            _CircleIcon(icon: Icons.arrow_back, onTap: () => Navigator.pop(context)),
                            const Spacer(),
                            _CircleIcon(
                              icon: state.isWishlisted(p.id) ? Icons.favorite : Icons.favorite_border,
                              tint: state.isWishlisted(p.id) ? const Color(0xFFE61E4D) : null,
                              onTap: () => state.toggleWishlist(p.id),
                            ),
                            const SizedBox(width: 10),
                            _CircleIcon(
                              icon: Icons.share_outlined,
                              onTap: () => SharePlus.instance.share(ShareParams(
                                text: context.tr('product_share_text')
                                    .replaceAll('{name}', p.name)
                                    .replaceAll('{price}', p.price.toStringAsFixed(0)),
                              )),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                          children: [
                            // ── Image ────────────────────────────────────────
                            Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(18),
                                  child: Container(
                                    height: 260,
                                    width: double.infinity,
                                    color: p.iconBg,
                                    child: p.imageUrl != null
                                        ? Image.network(p.imageUrl!, fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Center(child: Icon(p.icon, size: 100, color: p.iconColor)))
                                        : Center(child: Icon(p.icon, size: 100, color: p.iconColor)),
                                  ),
                                ),
                                if (p.reviewCount > 0)
                                  Positioned(
                                    bottom: 12,
                                    right: 12,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(p.rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w500, color: _P.text)),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.star_rounded, size: 16, color: Color(0xFF15803D)),
                                          const SizedBox(width: 6),
                                          Text('${p.reviewCount}', style: const TextStyle(color: _P.subtext, fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 18),

                            // ── Name + price ─────────────────────────────────
                            Text(p.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w500, color: _P.text)),
                            const SizedBox(height: 2),
                            Text(p.unit, style: const TextStyle(fontSize: 11, color: _P.subtext)),
                            const SizedBox(height: 10),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w500, color: _P.text)),
                                if (p.discountPercent > 0) ...[
                                  const SizedBox(width: 8),
                                  Text('₹${p.originalPrice.toStringAsFixed(0)}',
                                      style: const TextStyle(fontSize: 12, color: Color(0xFFB0B0B0), decoration: TextDecoration.lineThrough)),
                                  const SizedBox(width: 8),
                                  Text('${p.discountPercent}% off', style: const TextStyle(fontSize: 11, color: Color(0xFFEA580C), fontWeight: FontWeight.w500)),
                                ],
                              ],
                            ),
                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Delivery & services ──────────────────────────
                            Text(context.tr('product_delivery_services'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: const Color(0xFFF7F7F7), borderRadius: BorderRadius.circular(14)),
                              child: Row(
                                children: [
                                  const Icon(Icons.local_shipping_outlined, size: 18, color: _P.text),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(p.inStock ? context.tr('product_free_delivery_by').replaceAll('{date}', widget.deliveryDate) : context.tr('product_out_of_stock'),
                                            style: const TextStyle(fontWeight: FontWeight.w500, color: _P.text, fontSize: 11)),
                                        Text(context.tr('product_orders_above'), style: const TextStyle(fontSize: 10, color: _P.subtext)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                            _InfoLine(icon: Icons.storefront_outlined, text: context.tr('product_sold_by')),
                            _InfoLine(icon: Icons.payments_outlined, text: context.tr('product_cod_available')),
                            _InfoLine(icon: Icons.support_agent_outlined, text: context.tr('product_support_replacement')),

                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Product details (real description) ──────────
                            Text(context.tr('product_details'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                            const SizedBox(height: 8),
                            Text(
                              p.description.isNotEmpty ? p.description : context.tr('product_no_description'),
                              style: const TextStyle(fontSize: 12, color: _P.subtext, height: 1.5),
                            ),

                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Ratings & Reviews ────────────────────────────
                            Row(
                              children: [
                                Expanded(
                                  child: Text(context.tr('product_ratings_reviews'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                                ),
                                TextButton(
                                  onPressed: _writeReview,
                                  child: Text(context.tr('product_write_review'), style: const TextStyle(fontWeight: FontWeight.w500, color: _P.text)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            if (p.reviewCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(color: const Color(0xFF15803D), borderRadius: BorderRadius.circular(8)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(p.rating.toStringAsFixed(1), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.star_rounded, color: Colors.white, size: 16),
                                  ],
                                ),
                              ),
                            const SizedBox(height: 14),
                            if (_reviews.isEmpty)
                              Text(context.tr('product_no_reviews'), style: const TextStyle(color: _P.subtext, fontSize: 11))
                            else
                              ..._reviews.take(5).map((r) => _ReviewCard(review: r)),

                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Similar products ─────────────────────────────
                            _SimilarProducts(
                              category: p.category,
                              excludeId: p.id,
                              allProducts: state.products,
                              deliveryDate: widget.deliveryDate,
                            ),
                          ],
                        ),
                      ),

                      // ── Sticky footer: Buy Now / Add to Bag ──────────────
                      Container(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: _P.divider))),
                        child: Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: p.inStock ? _buyNow : null,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: _P.text,
                                  side: const BorderSide(color: _P.text),
                                  padding: const EdgeInsets.symmetric(vertical: 15),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: Text(context.tr('product_buy_now'), style: const TextStyle(fontWeight: FontWeight.w500)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: p.inStock
                                    ? () {
                                        widget.onAddToCart();
                                        Navigator.pop(context);
                                      }
                                    : null,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _P.text,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 15),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: Text(widget.cartQty > 0 ? context.tr('product_add_more') : context.tr('product_add_to_bag'), style: const TextStyle(fontWeight: FontWeight.w500)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoLine({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: _P.text),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 11, color: _P.text))),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final ProductReview review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final d = review.createdAt;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(border: Border.all(color: _P.divider), borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(color: const Color(0xFF15803D), borderRadius: BorderRadius.circular(6)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${review.rating}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 10)),
                    const Icon(Icons.star_rounded, color: Colors.white, size: 12),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text('${d.day} ${months[d.month - 1]} ${d.year}', style: const TextStyle(fontSize: 10, color: _P.subtext)),
            ],
          ),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(review.comment!, style: const TextStyle(fontSize: 11, color: _P.text, height: 1.4)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.check_circle, size: 13, color: Color(0xFF15803D)),
              const SizedBox(width: 4),
              Text(review.userName, style: const TextStyle(fontSize: 10, color: _P.subtext)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SimilarProducts extends StatelessWidget {
  final String category;
  final int excludeId;
  final List<Product> allProducts;
  final String deliveryDate;
  const _SimilarProducts({required this.category, required this.excludeId, required this.allProducts, required this.deliveryDate});

  @override
  Widget build(BuildContext context) {
    final similar = allProducts.where((p) => p.category == category && p.id != excludeId).toList();
    if (similar.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.tr('product_similar'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
        const SizedBox(height: 12),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: similar.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final p = similar[i];
              return GestureDetector(
                onTap: () => Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProductDetailScreen(
                      productId: p.id,
                      deliveryDate: deliveryDate,
                      onAddToCart: () {},
                      cartQty: 0,
                    ),
                  ),
                ),
                child: Container(
                  width: 140,
                  decoration: BoxDecoration(border: Border.all(color: _P.divider), borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        child: Container(height: 100, width: double.infinity, color: p.iconBg,
                            child: Center(child: Icon(p.icon, size: 40, color: p.iconColor))),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w400, color: _P.text)),
                            const SizedBox(height: 4),
                            Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: _P.text)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final Color? tint;
  final VoidCallback onTap;
  const _CircleIcon({required this.icon, this.tint, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: Icon(icon, size: 19, color: tint ?? _P.text),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: Color(0xFFDC2626)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: _P.text)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: Text(context.tr('common_retry'))),
          ],
        ),
      ),
    );
  }
}
