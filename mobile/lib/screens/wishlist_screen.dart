import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import 'product_detail_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<AppState>().loadWishlist();
      if (mounted) setState(() => _loading = false);
    });
  }

  String get _deliveryDate {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[tomorrow.weekday - 1]}, ${tomorrow.day} ${months[tomorrow.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final items = state.wishlist;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
              child: Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      width: 40, height: 40,
                      decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
                      child: const Icon(Icons.arrow_back, size: 19, color: _P.text),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(context.tr('wishlist_title'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : items.isEmpty
                      ? _EmptyWishlist()
                      : RefreshIndicator(
                          onRefresh: () => state.loadWishlist(),
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                            itemCount: items.length,
                            separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, color: _P.divider),
                            itemBuilder: (context, i) => _WishlistRow(
                              product: items[i],
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ProductDetailScreen(
                                    productId: items[i].id,
                                    deliveryDate: _deliveryDate,
                                    onAddToCart: () {},
                                    cartQty: 0,
                                  ),
                                ),
                              ),
                              onRemove: () => state.toggleWishlist(items[i].id),
                            ),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WishlistRow extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback onRemove;
  const _WishlistRow({required this.product, required this.onTap, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final p = product;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: InkWell(
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 76, height: 76,
                color: p.iconBg,
                child: p.imageUrl != null
                    ? Image.network(p.imageUrl!, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Center(child: Icon(p.icon, size: 32, color: p.iconColor)))
                    : Center(child: Icon(p.icon, size: 32, color: p.iconColor)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.text)),
                  const SizedBox(height: 4),
                  Text(p.unit, style: const TextStyle(fontSize: 10, color: _P.subtext)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _P.text)),
                      if (p.discountPercent > 0) ...[
                        const SizedBox(width: 6),
                        Text('₹${p.originalPrice.toStringAsFixed(0)}',
                            style: const TextStyle(fontSize: 10, color: Color(0xFFB0B0B0), decoration: TextDecoration.lineThrough)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            InkWell(
              onTap: onRemove,
              borderRadius: BorderRadius.circular(16),
              child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.favorite, color: Color(0xFFE61E4D), size: 22)),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyWishlist extends StatelessWidget {
  const _EmptyWishlist();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.favorite_border, size: 48, color: _P.subtext),
            const SizedBox(height: 14),
            Text(context.tr('wishlist_empty_title'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text)),
            const SizedBox(height: 6),
            Text(context.tr('wishlist_empty_sub'),
                textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: _P.subtext)),
          ],
        ),
      ),
    );
  }
}
