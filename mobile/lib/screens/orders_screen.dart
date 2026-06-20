import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../providers/app_state.dart';
import 'order_detail_screen.dart';
import 'write_review_sheet.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const tile = Color(0xFFF2F2F2);
  static const divider = Color(0xFFEBEBEB);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

String fmtOrderDate(DateTime d) => '${d.day} ${_months[d.month - 1]} ${d.year}';

String _fmtFullDateTime(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '${_weekdays[d.weekday - 1]}, ${d.day} ${_months[d.month - 1]}, $h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

class _StatusInfo {
  final IconData icon;
  final Color color;
  final Color bg;
  final String headline;
  final String subtitle;
  _StatusInfo(this.icon, this.color, this.bg, this.headline, this.subtitle);
}

_StatusInfo _statusInfo(OrderModel o) {
  switch (o.status) {
    case 'confirmed':
      return _StatusInfo(Icons.check_circle_outline, const Color(0xFF2563EB), const Color(0xFFEFF6FF),
          'Order Confirmed', 'Your order has been confirmed and is being prepared');
    case 'shipped':
      return _StatusInfo(Icons.local_shipping_outlined, const Color(0xFF7C3AED), const Color(0xFFF5F3FF),
          'Shipped', 'Your order is on its way');
    case 'delivered':
      return _StatusInfo(Icons.inventory_2_outlined, const Color(0xFF15803D), const Color(0xFFF0FDF4),
          'Delivered', 'On ${_fmtFullDateTime(o.updatedAt)}');
    case 'cancelled':
      return _StatusInfo(Icons.cancel_outlined, const Color(0xFFDC2626), const Color(0xFFFEF2F2),
          'Order Cancelled', 'This order was cancelled');
    default:
      return _StatusInfo(Icons.shopping_bag_outlined, const Color(0xFFD97706), const Color(0xFFFFFBEB),
          'Order Placed', "We've received your order");
  }
}

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ScaffoldMessenger.of(context).clearSnackBars();
      context.read<AppState>().loadOrders();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => context.read<AppState>().loadOrders(),
          child: state.isLoadingOrders
              ? const Center(child: CircularProgressIndicator())
              : state.ordersError != null
                  ? _ErrorView(message: state.ordersError!, onRetry: () => context.read<AppState>().loadOrders())
                  : state.orders.isEmpty
                      ? ListView(
                          children: [
                            const Padding(
                              padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
                              child: Text('My Orders',
                                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
                            ),
                            const _EmptyOrders(),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.only(bottom: 32),
                          itemCount: state.orders.length + 1,
                          separatorBuilder: (_, i) => i == 0 ? const SizedBox.shrink() : Container(height: 8, color: _P.tile),
                          itemBuilder: (context, i) {
                            if (i == 0) {
                              return const Padding(
                                padding: EdgeInsets.fromLTRB(20, 16, 20, 16),
                                child: Text('My Orders',
                                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
                              );
                            }
                            return _OrderBlock(order: state.orders[i - 1]);
                          },
                        ),
        ),
      ),
    );
  }
}

class _OrderBlock extends StatelessWidget {
  final OrderModel order;
  const _OrderBlock({required this.order});

  @override
  Widget build(BuildContext context) {
    final info = _statusInfo(order);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Status header ────────────────────────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(color: info.bg, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Icon(info.icon, color: info.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(info.headline, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                    const SizedBox(height: 2),
                    Text(info.subtitle, style: const TextStyle(fontSize: 11, color: _P.subtext)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Item cards ────────────────────────────────────────────────
          Container(
            decoration: BoxDecoration(border: Border.all(color: _P.divider), borderRadius: BorderRadius.circular(14)),
            child: Column(
              children: [
                for (int i = 0; i < order.items.length; i++) ...[
                  if (i > 0) const Divider(height: 1, thickness: 1, color: _P.divider),
                  _ItemRow(item: order.items[i], order: order),
                ],
              ],
            ),
          ),

          if (order.status == 'cancelled') ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _needHelp(context),
                icon: const Icon(Icons.support_agent_outlined, size: 18, color: _P.text),
                label: const Text('Need Help?', style: TextStyle(color: _P.text, fontWeight: FontWeight.w500)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: _P.divider),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _needHelp(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Contact support@mrunalagro.in for help with this order')),
    );
  }
}

class _ItemRow extends StatefulWidget {
  final OrderItem item;
  final OrderModel order;
  const _ItemRow({required this.item, required this.order});

  @override
  State<_ItemRow> createState() => _ItemRowState();
}

class _ItemRowState extends State<_ItemRow> {
  int _hoverRating = 0;
  bool _submitting = false;

  Future<void> _quickRate(int star) async {
    final productId = widget.item.productId;
    if (productId == null || _submitting) return;
    setState(() { _hoverRating = star; _submitting = true; });
    final err = await context.read<AppState>().submitReview(productId, star, null);
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final order = widget.order;
    final canReview = order.status == 'delivered' && item.productId != null;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order))),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 60, height: 60,
                    color: _P.tile,
                    child: item.productImage != null
                        ? Image.network(item.productImage!, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Center(child: Text('🌿', style: TextStyle(fontSize: 22))))
                        : const Center(child: Text('🌿', style: TextStyle(fontSize: 22))),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.productName, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.text)),
                      const SizedBox(height: 2),
                      Text('${item.unit ?? ''} · Qty ${item.qty}', style: const TextStyle(fontSize: 10, color: _P.subtext)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: _P.subtext),
              ],
            ),
          ),
          if (canReview) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(10)),
              child: Row(
                children: [
                  ...List.generate(5, (i) {
                    final star = i + 1;
                    return InkWell(
                      onTap: () => _quickRate(star),
                      child: Icon(
                        star <= _hoverRating ? Icons.star_rounded : Icons.star_border_rounded,
                        size: 20,
                        color: const Color(0xFFE61E4D),
                      ),
                    );
                  }),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final result = await showWriteReviewSheet(context,
                          productId: item.productId!, productName: item.productName, initialRating: _hoverRating == 0 ? 5 : _hoverRating);
                      if (result == true) setState(() {});
                    },
                    child: const Text('Write Review', style: TextStyle(color: Color(0xFFE61E4D), fontWeight: FontWeight.w600, fontSize: 11)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 64),
      child: Column(
        children: [
          const Text('📦', style: TextStyle(fontSize: 46)),
          const SizedBox(height: 14),
          const Text('No orders yet', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16, color: _P.text)),
          const SizedBox(height: 6),
          const Text('Orders you place from Market will appear here.',
              textAlign: TextAlign.center, style: TextStyle(color: _P.subtext, fontSize: 12)),
        ],
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
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 140, 32, 0),
          child: Column(
            children: [
              const Icon(Icons.error_outline, size: 44, color: Color(0xFFDC2626)),
              const SizedBox(height: 14),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: _P.text)),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      ],
    );
  }
}
