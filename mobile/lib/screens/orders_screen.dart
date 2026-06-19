import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../providers/app_state.dart';
import 'order_detail_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const tile = Color(0xFFF2F2F2);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String fmtOrderDate(DateTime d) => '${d.day} ${_months[d.month - 1]} ${d.year}';

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
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                      children: [
                        const Text('Orders',
                            style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
                        const SizedBox(height: 18),
                        if (state.orders.isEmpty)
                          const _EmptyOrders()
                        else
                          ...state.orders.map((o) => Padding(
                                padding: const EdgeInsets.only(bottom: 14),
                                child: _OrderCard(order: o),
                              )),
                      ],
                    ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  const _OrderCard({required this.order});

  String? get _thumb {
    for (final i in order.items) {
      if (i.productImage != null && i.productImage!.isNotEmpty) return i.productImage;
    }
    return null;
  }

  String get _title {
    if (order.items.isEmpty) return 'Order #${order.id}';
    final first = order.items.first.productName;
    final more = order.items.length - 1;
    return more > 0 ? '$first  +$more more' : first;
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)),
        ),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 14, offset: const Offset(0, 4)),
            ],
          ),
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 76,
                  height: 76,
                  color: _P.tile,
                  child: _thumb != null
                      ? Image.network(_thumb!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(child: Text('🌿', style: TextStyle(fontSize: 30))))
                      : const Center(child: Text('🌿', style: TextStyle(fontSize: 30))),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                    const SizedBox(height: 4),
                    Text(
                      '${fmtOrderDate(order.createdAt)} · ₹${order.total.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                      decoration: BoxDecoration(color: order.statusBg, borderRadius: BorderRadius.circular(20)),
                      child: Text(
                        order.status[0].toUpperCase() + order.status.substring(1),
                        style: TextStyle(color: order.statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 80),
      child: Column(
        children: [
          const Text('📦', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 14),
          const Text('No orders yet', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: _P.text)),
          const SizedBox(height: 6),
          const Text('Orders you place from Market will appear here.',
              textAlign: TextAlign.center, style: TextStyle(color: _P.subtext, fontSize: 14)),
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
              Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, color: _P.text)),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      ],
    );
  }
}
