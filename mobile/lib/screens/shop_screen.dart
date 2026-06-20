import 'package:flutter/material.dart';
import '../models/product.dart';
import 'cart_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const pillActive = Color(0xFF222222);
  static const pillInactive = Color(0xFFF2F2F2);
}

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  String _selectedCategory = 'All';
  final Map<int, int> _cart = {};
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';

  int get _cartCount => _cart.values.fold(0, (a, b) => a + b);
  double get _cartTotal => _cart.entries.fold(0, (sum, e) {
        final p = kProducts.firstWhere((p) => p.id == e.key);
        return sum + p.price * e.value;
      });

  List<Product> get _filtered {
    var list = kProducts.where((p) {
      final matchCat =
          _selectedCategory == 'All' || p.category == _selectedCategory;
      final matchSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.category.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).toList();
    return list;
  }

  String get _deliveryDate {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${days[tomorrow.weekday - 1]}, ${tomorrow.day} ${months[tomorrow.month - 1]}';
  }

  void _addToCart(Product p) {
    setState(() => _cart[p.id] = (_cart[p.id] ?? 0) + 1);
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${p.name} added to cart'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        backgroundColor: _P.text,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 80),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: 'View Cart',
          textColor: Colors.white,
          onPressed: _showCart,
        ),
      ),
    );
  }

  void _showCart() {
    ScaffoldMessenger.of(context).clearSnackBars();
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart is empty')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartScreen(
          cart: _cart,
          onUpdate: (id, qty) => setState(() {
            if (qty == 0) {
              _cart.remove(id);
            } else {
              _cart[id] = qty;
            }
          }),
          onOrderPlaced: () => setState(() => _cart.clear()),
        ),
      ),
    );
  }

  void _showProductDetail(Product p) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductDetailSheet(
        product: p,
        qty: _cart[p.id] ?? 0,
        deliveryDate: _deliveryDate,
        onAddToCart: () => _addToCart(p),
      ),
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Header: title + cart ─────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text('Market',
                          style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
                    ),
                    _CartIcon(count: _cartCount, onTap: _showCart),
                  ],
                ),
              ),
            ),

            // ── Search bar ─────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() => _searchQuery = v),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text),
                  decoration: InputDecoration(
                    hintText: 'Search seeds, fertilizers, tools…',
                    hintStyle: const TextStyle(fontSize: 14, color: _P.subtext),
                    prefixIcon: const Icon(Icons.search, color: _P.subtext, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close, size: 18, color: _P.subtext),
                            onPressed: () {
                              _searchCtrl.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: _P.pillInactive,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                  ),
                ),
              ),
            ),

            // ── Category pills ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: SizedBox(
                height: 56,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  itemCount: kCategories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final cat = kCategories[i];
                    final active = cat == _selectedCategory;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedCategory = cat),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                        decoration: BoxDecoration(
                          color: active ? _P.pillActive : _P.pillInactive,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          cat,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: active ? Colors.white : _P.text,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            // ── Delivery info banner ─────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(color: _P.pillInactive, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping_outlined, color: _P.text, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Free delivery by $_deliveryDate on orders above ₹499',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.text),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Results count ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  '${filtered.length} product${filtered.length == 1 ? '' : 's'}',
                  style: const TextStyle(fontSize: 13, color: _P.subtext, fontWeight: FontWeight.w400),
                ),
              ),
            ),

            // ── Product grid ─────────────────────────────────────────────────
            filtered.isEmpty
                ? SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.search_off_outlined, size: 44, color: _P.subtext),
                          const SizedBox(height: 12),
                          const Text('No products found', style: TextStyle(color: _P.text, fontSize: 15, fontWeight: FontWeight.w400)),
                        ],
                      ),
                    ),
                  )
                : SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.64,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => _ProductCard(
                          product: filtered[i],
                          qty: _cart[filtered[i].id] ?? 0,
                          deliveryDate: _deliveryDate,
                          onTap: () => _showProductDetail(filtered[i]),
                          onAdd: () => _addToCart(filtered[i]),
                        ),
                        childCount: filtered.length,
                      ),
                    ),
                  ),
          ],
        ),
      ),

      // Floating cart bar
      bottomSheet: _cartCount > 0
          ? GestureDetector(
              onTap: _showCart,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: const BoxDecoration(
                  color: _P.text,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('$_cartCount item${_cartCount > 1 ? 's' : ''}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text('View Cart',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w400, fontSize: 15)),
                      ),
                      Text(
                        '₹${_cartTotal.toStringAsFixed(0)}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                    ],
                  ),
                ),
              ),
            )
          : null,
    );
  }
}

class _CartIcon extends StatelessWidget {
  final int count;
  final VoidCallback onTap;
  const _CartIcon({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            const Icon(Icons.shopping_cart_outlined, color: _P.text, size: 22),
            if (count > 0)
              Positioned(
                top: 1,
                right: 3,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: const BoxDecoration(color: Color(0xFFE61E4D), shape: BoxShape.circle),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  child: Text(
                    '$count',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Product Card ──────────────────────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final Product product;
  final int qty;
  final String deliveryDate;
  final VoidCallback onTap;
  final VoidCallback onAdd;

  const _ProductCard({
    required this.product,
    required this.qty,
    required this.deliveryDate,
    required this.onTap,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    final p = product;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _P.divider),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product image area
            Stack(
              children: [
                Container(
                  height: 116,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: p.iconBg,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: Center(
                    child: Icon(p.icon, size: 52, color: p.iconColor),
                  ),
                ),
                // Discount badge
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(color: _P.text, borderRadius: BorderRadius.circular(20)),
                    child: Text(
                      '${p.discountPercent}% off',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                // Best seller badge
                if (p.isBestSeller)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _P.divider),
                      ),
                      child: const Text(
                        '★ Best',
                        style: TextStyle(color: _P.text, fontSize: 9, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
              ],
            ),

            // Details
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w400, color: _P.text, height: 1.3),
                    ),
                    const SizedBox(height: 2),
                    Text(p.unit, style: const TextStyle(fontSize: 10, color: _P.subtext)),
                    const SizedBox(height: 4),
                    // Rating
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, size: 13, color: _P.text),
                        const SizedBox(width: 2),
                        Text(p.rating.toStringAsFixed(1),
                            style: const TextStyle(color: _P.text, fontSize: 11, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 4),
                        Text('(${_fmtCount(p.reviewCount)})', style: const TextStyle(fontSize: 10, color: _P.subtext)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Price
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${p.price.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: _P.text),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          '₹${p.originalPrice.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFFB0B0B0), decoration: TextDecoration.lineThrough),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'By $deliveryDate',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, color: _P.subtext, fontWeight: FontWeight.w400),
                    ),
                    const Spacer(),
                    // Add to cart
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: qty > 0
                          ? Container(
                              decoration: BoxDecoration(
                                color: _P.pillInactive,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.check_circle, size: 14, color: _P.text),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$qty in cart',
                                    style: const TextStyle(fontSize: 11, color: _P.text, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            )
                          : ElevatedButton(
                              onPressed: onAdd,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _P.text,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Add to Cart', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _fmtCount(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }
}

// ── Product Detail Bottom Sheet ───────────────────────────────────────────────
class _ProductDetailSheet extends StatelessWidget {
  final Product product;
  final int qty;
  final String deliveryDate;
  final VoidCallback onAddToCart;

  const _ProductDetailSheet({
    required this.product,
    required this.qty,
    required this.deliveryDate,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    final p = product;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(width: 36, height: 4, decoration: BoxDecoration(color: _P.divider, borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 16),
          Center(
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(color: p.iconBg, borderRadius: BorderRadius.circular(16)),
              child: Icon(p.icon, size: 64, color: p.iconColor),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: _P.text, borderRadius: BorderRadius.circular(20)),
                child: Text('${p.discountPercent}% off', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
              if (p.isBestSeller) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _P.divider)),
                  child: const Text('★ Best Seller', style: TextStyle(color: _P.text, fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(p.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
          const SizedBox(height: 4),
          Text(p.unit, style: const TextStyle(fontSize: 13, color: _P.subtext)),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: _P.text)),
              const SizedBox(width: 8),
              Text('₹${p.originalPrice.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 14, color: Color(0xFFB0B0B0), decoration: TextDecoration.lineThrough)),
              const SizedBox(width: 8),
              Text('${p.discountPercent}% off', style: const TextStyle(fontSize: 13, color: _P.text, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: _P.pillInactive, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                const Icon(Icons.local_shipping_outlined, size: 18, color: _P.text),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Free delivery', style: TextStyle(fontWeight: FontWeight.w600, color: _P.text, fontSize: 13)),
                    Text('Delivered by $deliveryDate', style: const TextStyle(fontSize: 12, color: _P.subtext)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(p.description, style: const TextStyle(fontSize: 13, color: _P.subtext, height: 1.5)),
          const SizedBox(height: 20),
          Row(
            children: [
              const Icon(Icons.star_rounded, size: 16, color: _P.text),
              const SizedBox(width: 4),
              Text(p.rating.toStringAsFixed(1), style: const TextStyle(color: _P.text, fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              Text('${p.reviewCount} ratings', style: const TextStyle(fontSize: 13, color: _P.subtext)),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () {
                onAddToCart();
                Navigator.pop(context);
              },
              icon: const Icon(Icons.shopping_cart_outlined, size: 18),
              label: Text(
                qty > 0 ? 'Add More to Cart' : 'Add to Cart',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _P.text,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
