import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import 'cart_screen.dart';

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
      setState(() { _loading = false; _error = 'Could not load this product.'; });
    }
  }

  Future<void> _writeReview() async {
    final p = _product;
    if (p == null) return;
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _WriteReviewSheet(productId: p.id, productName: p.name),
    );
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
    final state = context.watch<AppState>();
    final p = _product;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null || p == null
                ? _ErrorView(message: _error ?? 'Product not found', onRetry: _load)
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
                                text: '${p.name} — ₹${p.price.toStringAsFixed(0)} on Mrunal Agro Market',
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
                                          Text(p.rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w600, color: _P.text)),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.star_rounded, size: 16, color: Color(0xFF15803D)),
                                          const SizedBox(width: 6),
                                          Text('${p.reviewCount}', style: const TextStyle(color: _P.subtext, fontSize: 13)),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 18),

                            // ── Name + price ─────────────────────────────────
                            Text(p.name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w600, color: _P.text)),
                            const SizedBox(height: 2),
                            Text(p.unit, style: const TextStyle(fontSize: 13, color: _P.subtext)),
                            const SizedBox(height: 10),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: _P.text)),
                                if (p.discountPercent > 0) ...[
                                  const SizedBox(width: 8),
                                  Text('₹${p.originalPrice.toStringAsFixed(0)}',
                                      style: const TextStyle(fontSize: 14, color: Color(0xFFB0B0B0), decoration: TextDecoration.lineThrough)),
                                  const SizedBox(width: 8),
                                  Text('${p.discountPercent}% off', style: const TextStyle(fontSize: 13, color: Color(0xFFEA580C), fontWeight: FontWeight.w600)),
                                ],
                              ],
                            ),
                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Delivery & services ──────────────────────────
                            const Text('Delivery & Services', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
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
                                        Text(p.inStock ? 'Free delivery by ${widget.deliveryDate}' : 'Out of stock',
                                            style: const TextStyle(fontWeight: FontWeight.w600, color: _P.text, fontSize: 13)),
                                        const Text('On orders above ₹499', style: TextStyle(fontSize: 12, color: _P.subtext)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                            const _InfoLine(icon: Icons.storefront_outlined, text: 'Sold by Mrunal Agro'),
                            const _InfoLine(icon: Icons.payments_outlined, text: 'Cash on Delivery available (+₹100 handling)'),
                            const _InfoLine(icon: Icons.support_agent_outlined, text: 'Contact support for replacement of damaged or incorrect items'),

                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Product details (real description) ──────────
                            const Text('Product Details', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                            const SizedBox(height: 8),
                            Text(
                              p.description.isNotEmpty ? p.description : 'No description provided yet.',
                              style: const TextStyle(fontSize: 14, color: _P.subtext, height: 1.5),
                            ),

                            const SizedBox(height: 18),
                            const Divider(height: 1, thickness: 1, color: _P.divider),
                            const SizedBox(height: 18),

                            // ── Ratings & Reviews ────────────────────────────
                            Row(
                              children: [
                                const Expanded(
                                  child: Text('Ratings & Reviews', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                                ),
                                TextButton(
                                  onPressed: _writeReview,
                                  child: const Text('Write a review', style: TextStyle(fontWeight: FontWeight.w600, color: _P.text)),
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
                                    Text(p.rating.toStringAsFixed(1), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.star_rounded, color: Colors.white, size: 16),
                                  ],
                                ),
                              ),
                            const SizedBox(height: 14),
                            if (_reviews.isEmpty)
                              const Text('No reviews yet — be the first to write one.', style: TextStyle(color: _P.subtext, fontSize: 13))
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
                                child: const Text('Buy Now', style: TextStyle(fontWeight: FontWeight.w600)),
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
                                child: Text(widget.cartQty > 0 ? 'Add More' : 'Add to Bag', style: const TextStyle(fontWeight: FontWeight.w600)),
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
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: _P.text))),
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
                    Text('${review.rating}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                    const Icon(Icons.star_rounded, color: Colors.white, size: 12),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text('${d.day} ${months[d.month - 1]} ${d.year}', style: const TextStyle(fontSize: 12, color: _P.subtext)),
            ],
          ),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(review.comment!, style: const TextStyle(fontSize: 13, color: _P.text, height: 1.4)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.check_circle, size: 13, color: Color(0xFF15803D)),
              const SizedBox(width: 4),
              Text(review.userName, style: const TextStyle(fontSize: 12, color: _P.subtext)),
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
        const Text('Similar Products', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
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
                            Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.text)),
                            const SizedBox(height: 4),
                            Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _P.text)),
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

class _WriteReviewSheet extends StatefulWidget {
  final int productId;
  final String productName;
  const _WriteReviewSheet({required this.productId, required this.productName});

  @override
  State<_WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<_WriteReviewSheet> {
  int _rating = 5;
  final _comment = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _saving = true; _error = null; });
    final err = await context.read<AppState>().submitReview(widget.productId, _rating, _comment.text.trim());
    if (!mounted) return;
    if (err == null) {
      Navigator.pop(context, true);
    } else {
      setState(() { _saving = false; _error = err; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(widget.productName, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
              ),
              InkWell(onTap: () => Navigator.pop(context), child: const Icon(Icons.close, color: _P.text)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: List.generate(5, (i) {
              final star = i + 1;
              return InkWell(
                onTap: () => setState(() => _rating = star),
                child: Icon(star <= _rating ? Icons.star_rounded : Icons.star_border_rounded, size: 36, color: const Color(0xFF15803D)),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _comment,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Share your experience with this product (optional)',
              hintStyle: const TextStyle(color: _P.subtext),
              contentPadding: const EdgeInsets.all(14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFB0B0B0))),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: _P.text,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
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
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
