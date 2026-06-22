import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../models/order.dart';
import '../providers/app_state.dart';
import '../services/api_client.dart';
import '../config/theme.dart';

const _codDeliveryCharge = 100.0;

class PaymentScreen extends StatefulWidget {
  final List<Map<String, dynamic>> items;
  final DeliveryAddress address;
  final double subtotal;
  final double discount;
  final String? couponCode;
  final VoidCallback onOrderPlaced;

  const PaymentScreen({
    super.key,
    required this.items,
    required this.address,
    required this.subtotal,
    required this.discount,
    this.couponCode,
    required this.onOrderPlaced,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  // UPI/Card are temporarily disabled pending Razorpay integration —
  // Cash on Delivery is the only completable payment method right now.
  static const _method = 'cod';

  bool _placing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ScaffoldMessenger.of(context).clearSnackBars();
    });
  }

  double get _deliveryCharge => _codDeliveryCharge;
  double get _total => widget.subtotal - widget.discount + _deliveryCharge;

  Future<void> _pay() async {
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final order = await context.read<AppState>().placeOrder(
        items: widget.items,
        address: widget.address,
        paymentMethod: _method,
        subtotal: widget.subtotal,
        deliveryCharge: _deliveryCharge,
        discount: widget.discount,
        total: _total,
        couponCode: widget.couponCode,
      );
      if (!mounted) return;
      widget.onOrderPlaced();
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle,
                color: AppColors.success,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                context.tr('payment_order_placed'),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppColors.text,
                ),
              ),
            ],
          ),
          content: Text(
            context
                .tr('payment_order_number')
                .replaceAll('{id}', '${order.id}')
                .replaceAll('{total}', _total.toStringAsFixed(0)),
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.subtext),
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.text,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  context.tr('payment_continue_shopping'),
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(context).popUntil((r) => r.isFirst);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _placing = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _placing = false;
        _error = context.tr('payment_order_failed');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.text,
        elevation: 0,
        title: Text(
          context.tr('payment_title'),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppColors.text,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Text(
                  context.tr('cart_order_summary'),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 14),
                _SummaryRow(
                  label: context.tr('cart_subtotal'),
                  value: '₹${widget.subtotal.toStringAsFixed(0)}',
                ),
                if (widget.discount > 0)
                  _SummaryRow(
                    label: context.tr('cart_coupon_discount'),
                    value: '−₹${widget.discount.toStringAsFixed(0)}',
                    valueColor: AppColors.success,
                  ),
                _SummaryRow(
                  label: context.tr('payment_delivery_charge'),
                  value: _deliveryCharge == 0
                      ? context.tr('payment_free')
                      : '₹${_deliveryCharge.toStringAsFixed(0)}',
                ),
                const SizedBox(height: 4),
                Text(
                  context.tr('payment_cod_handling'),
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.subtext,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(
                    height: 1,
                    thickness: 1,
                    color: AppColors.divider,
                  ),
                ),
                _SummaryRow(
                  label: context.tr('payment_total_payable'),
                  value: '₹${_total.toStringAsFixed(0)}',
                  bold: true,
                ),

                const SizedBox(height: 24),
                Text(
                  context.tr('payment_select_method'),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 14),

                _MethodTile(
                  selected: true,
                  title: context.tr('payment_cod_title'),
                  subtitle: context.tr('payment_cod_subtitle'),
                ),
                const SizedBox(height: 10),
                _MethodTile(
                  enabled: false,
                  selected: false,
                  title: context.tr('payment_upi_title'),
                  subtitle: context.tr('payment_upi_subtitle'),
                  badge: context.tr('payment_coming_soon'),
                ),
                const SizedBox(height: 10),
                _MethodTile(
                  enabled: false,
                  selected: false,
                  title: context.tr('payment_card_title'),
                  subtitle: context.tr('payment_card_subtitle'),
                  badge: context.tr('payment_coming_soon'),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: const TextStyle(
                      color: Color(0xFFDC2626),
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.divider)),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _placing ? null : _pay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.text,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _placing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        context
                            .tr('payment_pay_amount')
                            .replaceAll('{amount}', _total.toStringAsFixed(0)),
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MethodTile extends StatelessWidget {
  final bool selected;
  final bool enabled;
  final String title;
  final String subtitle;
  final String? badge;
  const _MethodTile({
    required this.selected,
    required this.title,
    required this.subtitle,
    this.enabled = true,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.55,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: enabled ? null : const Color(0xFFF7F7F7),
          border: Border.all(
            color: selected ? AppColors.text : AppColors.divider,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 20,
              color: enabled ? AppColors.text : AppColors.subtext,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: enabled ? AppColors.text : AppColors.subtext,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.subtext,
                    ),
                  ),
                ],
              ),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  badge!,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: AppColors.subtext,
                  ),
                ),
              ),
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
  const _SummaryRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: bold ? 17 : 15,
              fontWeight: bold ? FontWeight.w500 : FontWeight.w400,
              color: AppColors.text,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 17 : 15,
              fontWeight: bold ? FontWeight.w500 : FontWeight.w400,
              color: valueColor ?? AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}
