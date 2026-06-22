import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../models/order.dart';
import '../providers/app_state.dart';
import 'product_detail_screen.dart';
import 'write_review_sheet.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const card = Color(0xFFF7F7F7);
  static const tile = Color(0xFFF2F2F2);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

IconData _statusIcon(String status) {
  switch (status) {
    case 'confirmed':
      return Icons.check_circle_outline;
    case 'shipped':
      return Icons.local_shipping_outlined;
    case 'delivered':
      return Icons.inventory_2_outlined;
    case 'cancelled':
      return Icons.cancel_outlined;
    default:
      return Icons.shopping_bag_outlined;
  }
}

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

String _tomorrowLabel() {
  final tomorrow = DateTime.now().add(const Duration(days: 1));
  return '${_weekdays[tomorrow.weekday - 1]}, ${tomorrow.day} ${_months[tomorrow.month - 1]}';
}

String _statusHeadline(BuildContext context, String status) {
  switch (status) {
    case 'confirmed':
      return context.tr('orders_status_confirmed_headline');
    case 'shipped':
      return context.tr('orders_status_shipped_headline');
    case 'delivered':
      return context.tr('order_detail_item_delivered');
    case 'cancelled':
      return context.tr('orders_status_cancelled_headline');
    default:
      return context.tr('orders_status_placed_headline');
  }
}

class OrderDetailScreen extends StatefulWidget {
  final OrderModel order;
  const OrderDetailScreen({super.key, required this.order});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _pageController = PageController();
  int _page = 0;

  List<String> get _images => widget.order.items
      .map((i) => i.productImage)
      .where((u) => u != null && u.isNotEmpty)
      .cast<String>()
      .toList();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  String _date(DateTime d) => '${_dow(d.weekday)} ${d.day} ${_months[d.month - 1]}';
  String _time(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  String _dow(int w) => const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][w - 1];

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final o = widget.order;
    final images = _images;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // ── Back button ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Align(
                alignment: Alignment.topLeft,
                child: _CircleBack(onTap: () => Navigator.pop(context)),
              ),
            ),
            const SizedBox(height: 16),

            // ── Image carousel ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: SizedBox(
                  height: 280,
                  child: images.isEmpty
                      ? Container(color: _P.tile, child: const Center(child: Text('🌿', style: TextStyle(fontSize: 62))))
                      : Stack(
                          children: [
                            PageView.builder(
                              controller: _pageController,
                              itemCount: images.length,
                              onPageChanged: (i) => setState(() => _page = i),
                              itemBuilder: (_, i) => Image.network(
                                images[i],
                                fit: BoxFit.cover,
                                width: double.infinity,
                                errorBuilder: (_, __, ___) =>
                                    Container(color: _P.tile, child: const Center(child: Text('🌿', style: TextStyle(fontSize: 62)))),
                              ),
                            ),
                            if (images.length > 1)
                              Positioned(
                                bottom: 12,
                                left: 0,
                                right: 0,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(images.length, (i) {
                                    final active = i == _page;
                                    return AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      margin: const EdgeInsets.symmetric(horizontal: 3),
                                      width: active ? 8 : 6,
                                      height: active ? 8 : 6,
                                      decoration: BoxDecoration(
                                        color: active ? Colors.white : Colors.white.withValues(alpha: 0.5),
                                        shape: BoxShape.circle,
                                      ),
                                    );
                                  }),
                                ),
                              ),
                          ],
                        ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── Title + status ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.tr('order_detail_number').replaceAll('{id}', '${o.id}'),
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
                  const SizedBox(height: 4),
                  Text(context.tr('order_detail_placed_on').replaceAll('{date}', '${o.createdAt.day} ${_months[o.createdAt.month - 1]} ${o.createdAt.year}'),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Status banner ────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: o.statusBg, borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: [
                    Icon(_statusIcon(o.status), color: o.statusColor, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_statusHeadline(context, o.status), style: TextStyle(color: o.statusColor, fontWeight: FontWeight.w500, fontSize: 13)),
                          if (o.status == 'delivered' || o.status == 'shipped' || o.status == 'cancelled') ...[
                            const SizedBox(height: 2),
                            Text(_date(o.updatedAt), style: TextStyle(color: o.statusColor.withValues(alpha: 0.8), fontSize: 11)),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),

            // ── Ordered / Total card (two columns like check-in/checkout) ─
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(color: _P.card, borderRadius: BorderRadius.circular(18)),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(context.tr('order_detail_ordered_label'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                              const SizedBox(height: 6),
                              Text(_date(o.createdAt), style: const TextStyle(fontSize: 14, color: _P.text)),
                              Text(_time(o.createdAt), style: const TextStyle(fontSize: 13, color: _P.subtext)),
                            ],
                          ),
                        ),
                      ),
                      const VerticalDivider(width: 1, thickness: 1, color: _P.divider),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(context.tr('payment_title'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                              const SizedBox(height: 6),
                              Text(o.paymentMethod.toUpperCase(), style: const TextStyle(fontSize: 14, color: _P.text)),
                              Text('₹${o.total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, color: _P.subtext)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── Delivery address row (like "Your place") ─────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_outlined, size: 26, color: _P.text),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.tr('order_detail_delivery_address'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                        const SizedBox(height: 3),
                        Text('${o.deliveryAddress.name} · ${o.deliveryAddress.phone}',
                            style: const TextStyle(fontSize: 13, color: _P.subtext)),
                        Text(o.deliveryAddress.oneLine, style: const TextStyle(fontSize: 13, color: _P.subtext, height: 1.3)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Divider(height: 1, thickness: 1, color: _P.divider, indent: 20, endIndent: 20),
            const SizedBox(height: 22),

            // ── Order details ────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(context.tr('order_detail_title'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
            ),
            const SizedBox(height: 14),

            ...o.items.map((item) => Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              width: 52,
                              height: 52,
                              color: _P.tile,
                              child: item.productImage != null && item.productImage!.isNotEmpty
                                  ? Image.network(item.productImage!, fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Center(child: Text('🌿', style: TextStyle(fontSize: 20))))
                                  : const Center(child: Text('🌿', style: TextStyle(fontSize: 20))),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.productName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _P.text)),
                                Text(context.tr('order_detail_qty').replaceAll('{unit}', item.unit ?? '').replaceAll('{qty}', '${item.qty}'),
                                    style: const TextStyle(fontSize: 11, color: _P.subtext)),
                              ],
                            ),
                          ),
                          Text('₹${(item.price * item.qty).toStringAsFixed(0)}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _P.text)),
                        ],
                      ),
                      if (o.status == 'delivered' && item.productId != null) ...[
                        const SizedBox(height: 10),
                        _RatingBox(productId: item.productId!, productName: item.productName),
                      ],
                    ],
                  ),
                )),

            const SizedBox(height: 6),
            const Divider(height: 1, thickness: 1, color: _P.divider, indent: 20, endIndent: 20),
            const SizedBox(height: 14),

            // ── Summary ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  _SummaryRow(label: context.tr('cart_subtotal'), value: '₹${o.subtotal.toStringAsFixed(0)}'),
                  if (o.discount > 0)
                    _SummaryRow(label: '${context.tr('order_detail_discount')}${o.couponCode != null ? ' (${o.couponCode})' : ''}',
                        value: '−₹${o.discount.toStringAsFixed(0)}', valueColor: const Color(0xFF15803D)),
                  _SummaryRow(label: context.tr('order_detail_delivery_label'), value: o.deliveryCharge == 0 ? context.tr('payment_free') : '₹${o.deliveryCharge.toStringAsFixed(0)}'),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Divider(height: 1, thickness: 1, color: _P.divider),
                  ),
                  _SummaryRow(label: context.tr('order_detail_total'), value: '₹${o.total.toStringAsFixed(0)}', bold: true),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider, indent: 20, endIndent: 20),
            const SizedBox(height: 22),

            // ── You may also like ────────────────────────────────────────
            _YouMayAlsoLike(items: o.items),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;
  const _SummaryRow({required this.label, required this.value, this.bold = false, this.valueColor});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: bold ? 17 : 15,
      fontWeight: bold ? FontWeight.w600 : FontWeight.w400,
      color: valueColor ?? _P.text,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 17 : 15, fontWeight: bold ? FontWeight.w600 : FontWeight.w400, color: _P.text)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _CircleBack extends StatelessWidget {
  final VoidCallback onTap;
  const _CircleBack({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: const Icon(Icons.arrow_back, size: 22, color: _P.text),
      ),
    );
  }
}

/// Quick-tap star rating + "Write Review" link for a delivered item.
class _RatingBox extends StatefulWidget {
  final int productId;
  final String productName;
  const _RatingBox({required this.productId, required this.productName});

  @override
  State<_RatingBox> createState() => _RatingBoxState();
}

class _RatingBoxState extends State<_RatingBox> {
  int _rating = 0;
  bool _submitting = false;

  Future<void> _quickRate(int star) async {
    if (_submitting) return;
    setState(() { _rating = star; _submitting = true; });
    final err = await context.read<AppState>().submitReview(widget.productId, star, null);
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(10)),
      child: Row(
        children: [
          ...List.generate(5, (i) {
            final star = i + 1;
            return InkWell(
              onTap: () => _quickRate(star),
              child: Icon(
                star <= _rating ? Icons.star_rounded : Icons.star_border_rounded,
                size: 20,
                color: const Color(0xFFE61E4D),
              ),
            );
          }),
          const Spacer(),
          TextButton(
            onPressed: () async {
              await showWriteReviewSheet(context,
                  productId: widget.productId, productName: widget.productName, initialRating: _rating == 0 ? 5 : _rating);
            },
            child: Text(context.tr('orders_write_review'), style: const TextStyle(color: Color(0xFFE61E4D), fontWeight: FontWeight.w600, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

/// Real "similar category" recommendations from the actual catalog —
/// not a fabricated cross-sell list.
class _YouMayAlsoLike extends StatelessWidget {
  final List<OrderItem> items;
  const _YouMayAlsoLike({required this.items});

  @override
  Widget build(BuildContext context) {
    final allProducts = context.watch<AppState>().products;
    final orderedIds = items.map((i) => i.productId).whereType<int>().toSet();
    final categories = items.map((i) => i.category).whereType<String>().toSet();
    final suggestions = allProducts
        .where((p) => categories.contains(p.category) && !orderedIds.contains(p.id))
        .toList();
    if (suggestions.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.tr('order_detail_you_may_like'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
          const SizedBox(height: 14),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: suggestions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final p = suggestions[i];
                return GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                        productId: p.id,
                        deliveryDate: _tomorrowLabel(),
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
                          child: Container(
                            height: 100,
                            width: double.infinity,
                            color: p.iconBg,
                            child: Center(child: Icon(p.icon, size: 40, color: p.iconColor)),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w400, color: _P.text)),
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
      ),
    );
  }
}
