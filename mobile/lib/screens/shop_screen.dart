import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/product.dart';
import 'cart_screen.dart';

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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${p.name} added to cart'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 80),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: 'View Cart',
          onPressed: _showCart,
        ),
      ),
    );
  }

  void _showCart() {
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF15803D),
        foregroundColor: Colors.white,
        title: const Text('Agro Shop',
            style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        actions: [
          GestureDetector(
            onTap: _showCart,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.shopping_cart_outlined,
                      color: Colors.white, size: 26),
                  if (_cartCount > 0)
                    Positioned(
                      top: -4,
                      right: -6,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        constraints:
                            const BoxConstraints(minWidth: 18, minHeight: 18),
                        child: Text(
                          '$_cartCount',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _searchQuery = v),
              decoration: InputDecoration(
                hintText: 'Search seeds, fertilizers, tools…',
                hintStyle:
                    const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search,
                    color: Color(0xFF64748B), size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close,
                            size: 18, color: Color(0xFF64748B)),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          // Category chips
          SliverToBoxAdapter(
            child: SizedBox(
              height: 48,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: kCategories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final cat = kCategories[i];
                  final active = cat == _selectedCategory;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: active
                            ? const Color(0xFF15803D)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: active
                              ? const Color(0xFF15803D)
                              : const Color(0xFFE2E8F0),
                        ),
                        boxShadow: active
                            ? [
                                BoxShadow(
                                    color: const Color(0xFF15803D)
                                        .withValues(alpha: 0.25),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2))
                              ]
                            : [],
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: active ? Colors.white : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // 1-day delivery banner
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF15803D), Color(0xFF16A34A)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.local_shipping_outlined,
                      color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('FREE 1-Day Delivery',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 13)),
                        Text(
                          'Delivery by $_deliveryDate on all orders above ₹499',
                          style: const TextStyle(
                              color: Color(0xFFBBF7D0), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('Shop Now',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),

          // Results count
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
              child: Text(
                '${filtered.length} products',
                style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500),
              ),
            ),
          ),

          // Product grid
          filtered.isEmpty
              ? SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.search_off_outlined,
                            size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text('No products found',
                            style: TextStyle(color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                )
              : SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.62,
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

      // Floating cart bar
      bottomSheet: _cartCount > 0
          ? GestureDetector(
              onTap: _showCart,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: const BoxDecoration(
                  color: Color(0xFF15803D),
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('$_cartCount item${_cartCount > 1 ? 's' : ''}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text('View Cart',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 15)),
                    ),
                    Text(
                      '₹${_cartTotal.toStringAsFixed(0)}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 15),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_ios_rounded,
                        color: Colors.white, size: 14),
                  ],
                ),
              ),
            )
          : null,
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
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product image area
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: p.iconBg,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(14)),
                  ),
                  child: Center(
                    child: Icon(p.icon, size: 56, color: p.iconColor),
                  ),
                ),
                // Discount badge
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${p.discountPercent}% off',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                // Best seller badge
                if (p.isBestSeller)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        '★ Best',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w600),
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
                      style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          height: 1.3),
                    ),
                    const SizedBox(height: 2),
                    Text(p.unit,
                        style: TextStyle(
                            fontSize: 10, color: AppColors.textMuted)),
                    const SizedBox(height: 4),
                    // Rating
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF15803D),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 10, color: Colors.white),
                              const SizedBox(width: 2),
                              Text(p.rating.toStringAsFixed(1),
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '(${_fmtCount(p.reviewCount)})',
                          style: TextStyle(
                              fontSize: 10, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Price
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${p.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '₹${p.originalPrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Delivery
                    Row(
                      children: [
                        const Icon(Icons.local_shipping_outlined,
                            size: 11, color: Color(0xFF15803D)),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            'By $deliveryDate',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF15803D),
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    // Add to cart
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: qty > 0
                          ? Container(
                              decoration: BoxDecoration(
                                border: Border.all(
                                    color: const Color(0xFF15803D)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.check_circle_rounded,
                                      size: 14,
                                      color: Color(0xFF15803D)),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$qty in cart',
                                    style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF15803D),
                                        fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            )
                          : ElevatedButton(
                              onPressed: onAdd,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF15803D),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Add to Cart',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
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
            child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 16),
          // Image
          Center(
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: p.iconBg,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(p.icon, size: 64, color: p.iconColor),
            ),
          ),
          const SizedBox(height: 16),
          // Badges
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: const Color(0xFFDC2626),
                    borderRadius: BorderRadius.circular(6)),
                child: Text('${p.discountPercent}% off',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600)),
              ),
              if (p.isBestSeller) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(6)),
                  child: const Text('★ Best Seller',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(p.name,
              style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(p.unit,
              style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 10),
          // Price row
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹${p.price.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A))),
              const SizedBox(width: 8),
              Text('₹${p.originalPrice.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                      decoration: TextDecoration.lineThrough)),
              const SizedBox(width: 8),
              Text('${p.discountPercent}% off',
                  style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF15803D),
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          // Delivery info
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_shipping_outlined,
                    size: 18, color: Color(0xFF15803D)),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('FREE 1-Day Delivery',
                        style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF15803D),
                            fontSize: 13)),
                    Text('Delivered by $deliveryDate',
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF166534))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Description
          Text(p.description,
              style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.5)),
          const SizedBox(height: 20),
          // Rating bar
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                    color: const Color(0xFF15803D),
                    borderRadius: BorderRadius.circular(6)),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        size: 14, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(p.rating.toStringAsFixed(1),
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text('${p.reviewCount} ratings',
                  style: TextStyle(
                      fontSize: 13, color: AppColors.textSecondary)),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {
                onAddToCart();
                Navigator.pop(context);
              },
              icon: const Icon(Icons.shopping_cart_outlined, size: 18),
              label: Text(
                qty > 0 ? 'Add More to Cart' : 'Add to Cart',
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF15803D),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

