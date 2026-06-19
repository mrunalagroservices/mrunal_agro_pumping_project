import 'package:flutter/material.dart';
import '../models/order.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const card = Color(0xFFF7F7F7);
  static const tile = Color(0xFFF2F2F2);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
                      ? Container(color: _P.tile, child: const Center(child: Text('🌿', style: TextStyle(fontSize: 64))))
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
                                    Container(color: _P.tile, child: const Center(child: Text('🌿', style: TextStyle(fontSize: 64)))),
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
                  Text('Order #${o.id}',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
                  const SizedBox(height: 4),
                  Text('Placed on ${o.createdAt.day} ${_months[o.createdAt.month - 1]} ${o.createdAt.year}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext)),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: o.statusBg, borderRadius: BorderRadius.circular(20)),
                    child: Text(
                      o.status[0].toUpperCase() + o.status.substring(1),
                      style: TextStyle(color: o.statusColor, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
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
                              const Text('Ordered', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                              const SizedBox(height: 6),
                              Text(_date(o.createdAt), style: const TextStyle(fontSize: 16, color: _P.text)),
                              Text(_time(o.createdAt), style: const TextStyle(fontSize: 15, color: _P.subtext)),
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
                              const Text('Payment', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                              const SizedBox(height: 6),
                              Text(o.paymentMethod.toUpperCase(), style: const TextStyle(fontSize: 16, color: _P.text)),
                              Text('₹${o.total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 15, color: _P.subtext)),
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
                        const Text('Delivery address', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                        const SizedBox(height: 3),
                        Text('${o.deliveryAddress.name} · ${o.deliveryAddress.phone}',
                            style: const TextStyle(fontSize: 15, color: _P.subtext)),
                        Text(o.deliveryAddress.oneLine, style: const TextStyle(fontSize: 15, color: _P.subtext, height: 1.3)),
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
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text('Order details', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: _P.text)),
            ),
            const SizedBox(height: 14),

            ...o.items.map((item) => Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          width: 52,
                          height: 52,
                          color: _P.tile,
                          child: item.productImage != null && item.productImage!.isNotEmpty
                              ? Image.network(item.productImage!, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Center(child: Text('🌿', style: TextStyle(fontSize: 22))))
                              : const Center(child: Text('🌿', style: TextStyle(fontSize: 22))),
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
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                            Text('${item.unit ?? ''}  ·  Qty ${item.qty}',
                                style: const TextStyle(fontSize: 13, color: _P.subtext)),
                          ],
                        ),
                      ),
                      Text('₹${(item.price * item.qty).toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: _P.text)),
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
                  _SummaryRow(label: 'Subtotal', value: '₹${o.subtotal.toStringAsFixed(0)}'),
                  if (o.discount > 0)
                    _SummaryRow(label: 'Discount${o.couponCode != null ? ' (${o.couponCode})' : ''}',
                        value: '−₹${o.discount.toStringAsFixed(0)}', valueColor: const Color(0xFF15803D)),
                  _SummaryRow(label: 'Delivery', value: o.deliveryCharge == 0 ? 'Free' : '₹${o.deliveryCharge.toStringAsFixed(0)}'),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Divider(height: 1, thickness: 1, color: _P.divider),
                  ),
                  _SummaryRow(label: 'Total', value: '₹${o.total.toStringAsFixed(0)}', bold: true),
                ],
              ),
            ),
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
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      color: valueColor ?? _P.text,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 17 : 15, fontWeight: bold ? FontWeight.w700 : FontWeight.w400, color: _P.text)),
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
