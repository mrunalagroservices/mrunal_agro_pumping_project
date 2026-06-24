import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../l10n/tr_extension.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import 'cart_screen.dart';
import 'product_detail_screen.dart';
import 'wishlist_screen.dart';
import '../config/theme.dart';

// ── Promo banners (text/icon based — no image assets needed) ────────────────
class _Banner {
  final List<Color> gradient;
  final IconData icon;
  final String titleKey;
  final String subtitleKey;
  const _Banner(this.gradient, this.icon, this.titleKey, this.subtitleKey);
}

const _heroBanners = [
  _Banner([Color(0xFF16A34A), Color(0xFF15803D)], Icons.eco, 'shop_banner_seeds_title', 'shop_banner_seeds_sub'),
  _Banner([Color(0xFFEA580C), Color(0xFFC2410C)], Icons.bug_report, 'shop_banner_pesticide_title', 'shop_banner_pesticide_sub'),
  _Banner([Color(0xFF0891B2), Color(0xFF0E7490)], Icons.water_drop, 'shop_banner_irrigation_title', 'shop_banner_irrigation_sub'),
  _Banner([Color(0xFF7C3AED), Color(0xFF6D28D9)], Icons.local_shipping, 'shop_banner_delivery_title', 'shop_banner_delivery_sub'),
];

const _midBanners = [
  _Banner([Color(0xFFD97706), Color(0xFFB45309)], Icons.local_offer, 'shop_banner_offer_title', 'shop_banner_offer_sub'),
  _Banner([Color(0xFF0EA5E9), Color(0xFF0284C7)], Icons.agriculture, 'shop_banner_tools_title', 'shop_banner_tools_sub'),
];

/// Auto-rotating full-width hero carousel at the top of the Market home —
/// the Myntra/Flipkart/Amazon-style banner strip. Swipeable too.
class _HeroBannerCarousel extends StatefulWidget {
  const _HeroBannerCarousel();

  @override
  State<_HeroBannerCarousel> createState() => _HeroBannerCarouselState();
}

class _HeroBannerCarouselState extends State<_HeroBannerCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      _page = (_page + 1) % _heroBanners.length;
      _controller.animateToPage(
        _page,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 130,
          child: PageView.builder(
            controller: _controller,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: _heroBanners.length,
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _BannerCard(banner: _heroBanners[i]),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_heroBanners.length, (i) {
            final active = i == _page;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active ? AppColors.accent : AppColors.chip,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  final _Banner banner;
  const _BannerCard({required this.banner});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: banner.gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.all(18),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(banner.icon, size: 90, color: Colors.white.withValues(alpha: 0.18)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                context.tr(banner.titleKey),
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr(banner.subtitleKey),
                style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12, fontWeight: FontWeight.w400),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Single full-width promo banner used between sections / inside the grid —
/// same visual language as the hero carousel, just static.
class _PromoBannerStrip extends StatelessWidget {
  final _Banner banner;
  const _PromoBannerStrip({required this.banner});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
      child: SizedBox(height: 84, child: _BannerCard(banner: banner)),
    );
  }
}

/// Horizontally-scrollable product row with a section title + "See all" —
/// the "Best Sellers" / "New Arrivals" rows on a Myntra/Flipkart home tab.
class _ProductSection extends StatelessWidget {
  final String titleKey;
  final List<Product> products;
  final AppState state;
  final void Function(Product) onOpen;
  final void Function(Product) onToggleWishlist;

  const _ProductSection({
    required this.titleKey,
    required this.products,
    required this.state,
    required this.onOpen,
    required this.onToggleWishlist,
  });

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
          child: Text(
            context.tr(titleKey),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.text),
          ),
        ),
        SizedBox(
          height: 230,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final p = products[i];
              return SizedBox(
                width: 150,
                child: _ProductCard(
                  product: p,
                  wishlisted: state.isWishlisted(p.id),
                  onTap: () => onOpen(p),
                  onToggleWishlist: () => onToggleWishlist(p),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Maps a category name from the backend to its translation key, falling
/// back to the raw name for categories without a known translation.
String categoryLabel(BuildContext context, String category) {
  const keys = {
    'All': 'category_all',
    'Seeds': 'category_seeds',
    'Fertilizers': 'category_fertilizers',
    'Irrigation': 'category_irrigation',
    'Tools': 'category_tools',
    'Pesticides': 'category_pesticides',
    'Others': 'category_others',
  };
  final key = keys[category];
  return key != null ? context.tr(key) : category;
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
  List<String> _categories = [];

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final state = context.read<AppState>();
      await state.loadProducts();
      state.loadWishlist();
      try {
        final cats = await state.fetchCategories();
        if (mounted) setState(() => _categories = cats);
      } catch (_) {
        // Category pills just fall back to "All" if this fails.
      }
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _speech.stop();
    super.dispose();
  }

  // Tapping the mic mid-listen stops it; otherwise this requests the mic
  // permission (handled by the plugin) and starts a one-shot voice search.
  Future<void> _toggleVoiceSearch() async {
    if (_isListening) {
      await _speech.stop();
      if (mounted) setState(() => _isListening = false);
      return;
    }

    HapticFeedback.selectionClick();
    final available = await _speech.initialize(
      onStatus: (status) {
        if ((status == 'done' || status == 'notListening') && mounted) {
          setState(() => _isListening = false);
        }
      },
      onError: (_) {
        if (mounted) setState(() => _isListening = false);
      },
    );
    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('shop_voice_search_unavailable'))),
        );
      }
      return;
    }

    setState(() => _isListening = true);
    _speech.listen(
      onResult: (result) {
        setState(() {
          _searchCtrl.text = result.recognizedWords;
          _searchQuery = result.recognizedWords;
        });
      },
    );
  }

  int get _cartCount => _cart.values.fold(0, (a, b) => a + b);

  List<Product> get _allProducts => context.read<AppState>().products;

  double _cartTotal(List<Product> all) => _cart.entries.fold(0, (sum, e) {
    final p = all.firstWhere((p) => p.id == e.key, orElse: () => all.first);
    return sum + p.price * e.value;
  });

  List<Product> _filtered(List<Product> all) {
    return all.where((p) {
      final matchCat =
          _selectedCategory == 'All' || p.category == _selectedCategory;
      final matchSearch =
          _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.category.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).toList();
  }

  // Home layout (banners + sections) only when browsing with no active
  // search/category filter — the moment the user searches or picks a
  // category, a flat results grid (the previous default for everything) is
  // the right UX, same as Myntra/Flipkart/Amazon switch to a results list.
  bool get _showHome => _searchQuery.isEmpty && _selectedCategory == 'All';

  List<Widget> _buildHomeSlivers(BuildContext context, AppState state, List<Product> all) {
    final bestSellers = all.where((p) => p.isBestSeller).toList();
    final bestSellersList = bestSellers.isNotEmpty
        ? bestSellers
        : (List<Product>.from(all)..sort((a, b) => b.rating.compareTo(a.rating)))
            .take(8)
            .toList();
    final newArrivals = (List<Product>.from(all)..sort((a, b) => b.id.compareTo(a.id)))
        .take(10)
        .toList();

    return [
      const SliverToBoxAdapter(child: SizedBox(height: 16)),
      const SliverToBoxAdapter(child: _HeroBannerCarousel()),
      const SliverToBoxAdapter(child: SizedBox(height: 20)),
      SliverToBoxAdapter(
        child: _ProductSection(
          titleKey: 'shop_section_best_sellers',
          products: bestSellersList,
          state: state,
          onOpen: _openProduct,
          onToggleWishlist: (p) => state.toggleWishlist(p.id),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: 22)),
      SliverToBoxAdapter(child: _PromoBannerStrip(banner: _midBanners[0])),
      const SliverToBoxAdapter(child: SizedBox(height: 26)),
      SliverToBoxAdapter(
        child: _ProductSection(
          titleKey: 'shop_section_new_arrivals',
          products: newArrivals,
          state: state,
          onOpen: _openProduct,
          onToggleWishlist: (p) => state.toggleWishlist(p.id),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: 22)),
      SliverToBoxAdapter(child: _PromoBannerStrip(banner: _midBanners[1])),
      const SliverToBoxAdapter(child: SizedBox(height: 26)),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
          child: Text(
            context.tr('shop_section_all_products'),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.text),
          ),
        ),
      ),
      ..._buildChunkedGridWithBanners(state, all),
      const SliverToBoxAdapter(child: SizedBox(height: 100)),
    ];
  }

  // Splits the full catalog into chunks of 8 products, each its own grid,
  // with a small banner slotted in between chunks — banners "in the middle
  // of the products" rather than only at the top/between sections.
  List<Widget> _buildChunkedGridWithBanners(AppState state, List<Product> all) {
    const chunkSize = 8;
    final widgets = <Widget>[];
    for (var start = 0; start < all.length; start += chunkSize) {
      final chunk = all.sublist(start, (start + chunkSize).clamp(0, all.length));
      widgets.add(
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 18,
              childAspectRatio: 0.74,
            ),
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _ProductCard(
                product: chunk[i],
                wishlisted: state.isWishlisted(chunk[i].id),
                onTap: () => _openProduct(chunk[i]),
                onToggleWishlist: () => state.toggleWishlist(chunk[i].id),
              ),
              childCount: chunk.length,
            ),
          ),
        ),
      );
      final isLastChunk = start + chunkSize >= all.length;
      if (!isLastChunk) {
        widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 18)));
        widgets.add(
          SliverToBoxAdapter(
            child: _PromoBannerStrip(
              banner: _heroBanners[(start ~/ chunkSize) % _heroBanners.length],
            ),
          ),
        );
        widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 18)));
      }
    }
    return widgets;
  }

  List<Widget> _buildSearchSlivers(BuildContext context, AppState state, List<Product> filtered) {
    return [
      // ── Delivery info banner ─────────────────────────────
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.chip,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_shipping_outlined, color: AppColors.text, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('shop_free_delivery').replaceAll('{date}', _deliveryDate),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: AppColors.text),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),

      // ── Results count ───────────────────────────────────
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text(
            context.tr('shop_n_products').replaceAll('{n}', '${filtered.length}'),
            style: const TextStyle(fontSize: 11, color: AppColors.subtext, fontWeight: FontWeight.w400),
          ),
        ),
      ),

      // ── Product grid ────────────────────────────────────
      filtered.isEmpty
          ? SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.search_off_outlined, size: 44, color: AppColors.subtext),
                    const SizedBox(height: 12),
                    Text(
                      context.tr('shop_no_products'),
                      style: const TextStyle(color: AppColors.text, fontSize: 13, fontWeight: FontWeight.w400),
                    ),
                  ],
                ),
              ),
            )
          : SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 18,
                  childAspectRatio: 0.74,
                ),
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _ProductCard(
                    product: filtered[i],
                    wishlisted: state.isWishlisted(filtered[i].id),
                    onTap: () => _openProduct(filtered[i]),
                    onToggleWishlist: () => state.toggleWishlist(filtered[i].id),
                  ),
                  childCount: filtered.length,
                ),
              ),
            ),
    ];
  }

  String get _deliveryDate {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${days[tomorrow.weekday - 1]}, ${tomorrow.day} ${months[tomorrow.month - 1]}';
  }

  void _addToCart(Product p) {
    setState(() => _cart[p.id] = (_cart[p.id] ?? 0) + 1);
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.tr('shop_added_to_cart').replaceAll('{name}', p.name),
        ),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.text,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 80),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: context.tr('shop_view_cart'),
          textColor: Colors.white,
          onPressed: _showCart,
        ),
      ),
    );
  }

  void _showCart() {
    ScaffoldMessenger.of(context).clearSnackBars();
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.tr('shop_cart_empty'))));
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartScreen(
          cart: _cart,
          products: _allProducts,
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

  void _openProduct(Product p) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          productId: p.id,
          deliveryDate: _deliveryDate,
          onAddToCart: () => _addToCart(p),
          cartQty: _cart[p.id] ?? 0,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final all = state.products;
    final filtered = _filtered(all);
    final cats = [
      'All',
      ...(_categories.isNotEmpty
          ? _categories
          : const [
              'Seeds',
              'Fertilizers',
              'Irrigation',
              'Tools',
              'Pesticides',
              'Others',
            ]),
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: state.isLoadingProducts && all.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : state.productsError != null && all.isEmpty
            ? _ErrorView(
                message: state.productsError!,
                onRetry: () => state.loadProducts(),
              )
            : RefreshIndicator(
                onRefresh: () => state.loadProducts(),
                child: CustomScrollView(
                  slivers: [
                    // ── Header: title + wishlist + cart ─────────────────
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                context.tr('nav_market'),
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.text,
                                  letterSpacing: -0.3,
                                ),
                              ),
                            ),
                            const LanguageSwitcher(size: 40),
                            const SizedBox(width: 10),
                            _CircleIconBtn(
                              icon: Icons.favorite_border,
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const WishlistScreen(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            _CartIcon(count: _cartCount, onTap: _showCart),
                          ],
                        ),
                      ),
                    ),

                    // ── Search bar ──────────────────────────────────────
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                        child: TextField(
                          controller: _searchCtrl,
                          onChanged: (v) => setState(() => _searchQuery = v),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: AppColors.text,
                          ),
                          decoration: InputDecoration(
                            hintText: context.tr('shop_search_hint'),
                            hintStyle: const TextStyle(
                              fontSize: 12,
                              color: AppColors.subtext,
                            ),
                            prefixIcon: const Icon(
                              Icons.search,
                              color: AppColors.subtext,
                              size: 20,
                            ),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(
                                      Icons.close,
                                      size: 18,
                                      color: AppColors.subtext,
                                    ),
                                    onPressed: () {
                                      _searchCtrl.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : IconButton(
                                    icon: Icon(
                                      _isListening ? Icons.mic : Icons.mic_none,
                                      size: 20,
                                      color: _isListening ? AppColors.accent : AppColors.subtext,
                                    ),
                                    onPressed: _toggleVoiceSearch,
                                  ),
                            filled: true,
                            fillColor: AppColors.chip,
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 0,
                              horizontal: 16,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                    ),

                    // ── Category pills ──────────────────────────────────
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 56,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                          itemCount: cats.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final cat = cats[i];
                            final active = cat == _selectedCategory;
                            return GestureDetector(
                              onTap: () =>
                                  setState(() => _selectedCategory = cat),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: active
                                      ? AppColors.text
                                      : AppColors.chip,
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  categoryLabel(context, cat),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w400,
                                    color: active
                                        ? Colors.white
                                        : AppColors.text,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    ...(_showHome
                        ? _buildHomeSlivers(context, state, all)
                        : _buildSearchSlivers(context, state, filtered)),
                  ],
                ),
              ),
      ),

      // Floating cart bar
      bottomSheet: _cartCount > 0
          ? GestureDetector(
              onTap: _showCart,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
                decoration: const BoxDecoration(
                  color: AppColors.text,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          context
                              .tr('shop_n_items')
                              .replaceAll('{n}', '$_cartCount'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.tr('shop_view_cart'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w400,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      Text(
                        '₹${_cartTotal(all).toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: Colors.white,
                        size: 14,
                      ),
                    ],
                  ),
                ),
              ),
            )
          : null,
    );
  }
}

class _CircleIconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleIconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(
          color: AppColors.chip,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: AppColors.text, size: 21),
      ),
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
        decoration: const BoxDecoration(
          color: AppColors.chip,
          shape: BoxShape.circle,
        ),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            const Icon(
              Icons.shopping_cart_outlined,
              color: AppColors.text,
              size: 22,
            ),
            if (count > 0)
              Positioned(
                top: 1,
                right: 3,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Text(
                    '$count',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.w500,
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

// ── Product Card (matches the Myntra grid reference exactly) ──────────────────
class _ProductCard extends StatelessWidget {
  final Product product;
  final bool wishlisted;
  final VoidCallback onTap;
  final VoidCallback onToggleWishlist;

  const _ProductCard({
    required this.product,
    required this.wishlisted,
    required this.onTap,
    required this.onToggleWishlist,
  });

  @override
  Widget build(BuildContext context) {
    final p = product;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Image with floating wishlist heart ──────────────────────────
          AspectRatio(
            aspectRatio: 1,
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: double.infinity,
                    color: p.iconBg,
                    child: p.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: p.imageUrl!,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => Center(
                              child: Icon(p.icon, size: 48, color: p.iconColor),
                            ),
                          )
                        : Center(
                            child: Icon(p.icon, size: 48, color: p.iconColor),
                          ),
                  ),
                ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: InkWell(
                    onTap: onToggleWishlist,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        wishlisted ? Icons.favorite : Icons.favorite_border,
                        size: 16,
                        color: wishlisted
                            ? AppColors.accent
                            : AppColors.subtext,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // ── Rating row ───────────────────────────────────────────────────
          if (p.reviewCount > 0)
            Row(
              children: [
                Text(
                  p.rating.toStringAsFixed(1),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(width: 3),
                const Icon(
                  Icons.star_rounded,
                  size: 13,
                  color: Color(0xFF15803D),
                ),
                const SizedBox(width: 6),
                Text(
                  _fmtCount(p.reviewCount),
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.subtext,
                  ),
                ),
              ],
            ),
          const SizedBox(height: 3),

          // ── Name ─────────────────────────────────────────────────────────
          Text(
            p.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w400,
              color: AppColors.text,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 4),

          // ── Price row ────────────────────────────────────────────────────
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 6,
            children: [
              if (p.discountPercent > 0)
                Text(
                  '₹${p.originalPrice.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.subtext,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              Text(
                '₹${p.price.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              if (p.discountPercent > 0)
                Text(
                  '${p.discountPercent}% OFF',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFEA580C),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtCount(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
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
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.text),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onRetry,
              child: Text(context.tr('common_retry')),
            ),
          ],
        ),
      ),
    );
  }
}
