import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../providers/app_state.dart';
import '../services/api_client.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const fieldBorder = Color(0xFFB0B0B0);
  static const green = Color(0xFF15803D);
}

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
  String _method = 'cod'; // cod | upi | card
  final _upiId = TextEditingController();
  final _cardNumber = TextEditingController();
  final _cardExpiry = TextEditingController();
  final _cardCvv = TextEditingController();

  bool _placing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ScaffoldMessenger.of(context).clearSnackBars();
    });
  }

  @override
  void dispose() {
    _upiId.dispose();
    _cardNumber.dispose();
    _cardExpiry.dispose();
    _cardCvv.dispose();
    super.dispose();
  }

  double get _deliveryCharge => _method == 'cod' ? _codDeliveryCharge : 0;
  double get _total => widget.subtotal - widget.discount + _deliveryCharge;

  bool get _methodReady {
    if (_method == 'cod') return true;
    if (_method == 'upi') return _upiId.text.contains('@');
    return _cardNumber.text.replaceAll(' ', '').length == 16 &&
        _cardExpiry.text.isNotEmpty &&
        _cardCvv.text.length >= 3;
  }

  Future<void> _pay() async {
    if (!_methodReady) {
      setState(() => _error = 'Please complete the payment details.');
      return;
    }
    setState(() { _placing = true; _error = null; });
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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, color: _P.green, size: 48),
              SizedBox(height: 12),
              Text('Order placed!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
            ],
          ),
          content: Text('Order #${order.id} · ₹${_total.toStringAsFixed(0)}',
              textAlign: TextAlign.center, style: const TextStyle(color: _P.subtext)),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _P.text,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Continue Shopping', style: TextStyle(fontWeight: FontWeight.w500)),
              ),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(context).popUntil((r) => r.isFirst);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() { _placing = false; _error = e.message; });
    } catch (_) {
      if (!mounted) return;
      setState(() { _placing = false; _error = 'Could not place order. Please try again.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: _P.text,
        elevation: 0,
        title: const Text('Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                const Text('Order summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                const SizedBox(height: 14),
                _SummaryRow(label: 'Subtotal', value: '₹${widget.subtotal.toStringAsFixed(0)}'),
                if (widget.discount > 0)
                  _SummaryRow(label: 'Coupon discount', value: '−₹${widget.discount.toStringAsFixed(0)}', valueColor: _P.green),
                _SummaryRow(
                  label: 'Delivery charge',
                  value: _deliveryCharge == 0 ? 'Free' : '₹${_deliveryCharge.toStringAsFixed(0)}',
                ),
                if (_method == 'cod') ...[
                  const SizedBox(height: 4),
                  const Text('Cash on delivery adds ₹100 handling charge.', style: TextStyle(fontSize: 10, color: _P.subtext)),
                ],
                const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Divider(height: 1, thickness: 1, color: _P.divider)),
                _SummaryRow(label: 'Total payable', value: '₹${_total.toStringAsFixed(0)}', bold: true),

                const SizedBox(height: 24),
                const Text('Select payment method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                const SizedBox(height: 14),

                _MethodTile(
                  selected: _method == 'cod',
                  title: 'Cash on Delivery',
                  subtitle: 'Pay with cash when your order arrives · +₹100',
                  onTap: () => setState(() => _method = 'cod'),
                ),
                const SizedBox(height: 10),
                _MethodTile(
                  selected: _method == 'upi',
                  title: 'UPI',
                  subtitle: 'Pay instantly via any UPI app · Free delivery',
                  onTap: () => setState(() => _method = 'upi'),
                  expanded: _method == 'upi'
                      ? Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: _Field(label: 'UPI ID (e.g. name@bank)', controller: _upiId, onChanged: () => setState(() {})),
                        )
                      : null,
                ),
                const SizedBox(height: 10),
                _MethodTile(
                  selected: _method == 'card',
                  title: 'Card',
                  subtitle: 'Visa, Mastercard, RuPay · Free delivery',
                  onTap: () => setState(() => _method = 'card'),
                  expanded: _method == 'card'
                      ? Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Column(
                            children: [
                              _Field(label: 'Card number', controller: _cardNumber, keyboardType: TextInputType.number, onChanged: () => setState(() {})),
                              const SizedBox(height: 10),
                              Row(children: [
                                Expanded(child: _Field(label: 'MM/YY', controller: _cardExpiry, onChanged: () => setState(() {}))),
                                const SizedBox(width: 10),
                                Expanded(child: _Field(label: 'CVV', controller: _cardCvv, keyboardType: TextInputType.number, onChanged: () => setState(() {}))),
                              ]),
                            ],
                          ),
                        )
                      : null,
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
            decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: _P.divider))),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _placing ? null : _pay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _P.text,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _placing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Pay ₹${_total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
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
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Widget? expanded;
  const _MethodTile({required this.selected, required this.title, required this.subtitle, required this.onTap, this.expanded});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? _P.text : _P.divider, width: selected ? 1.5 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, size: 20, color: _P.text),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text)),
                      Text(subtitle, style: const TextStyle(fontSize: 11, color: _P.subtext)),
                    ],
                  ),
                ),
              ],
            ),
            if (expanded != null) expanded!,
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final VoidCallback? onChanged;
  const _Field({required this.label, required this.controller, this.keyboardType, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      onChanged: (_) => onChanged?.call(),
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.text),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 11, color: _P.subtext),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
        focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: _P.text, width: 1.5)),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 17 : 15, fontWeight: bold ? FontWeight.w500 : FontWeight.w400, color: _P.text)),
          Text(value, style: TextStyle(fontSize: bold ? 17 : 15, fontWeight: bold ? FontWeight.w500 : FontWeight.w400, color: valueColor ?? _P.text)),
        ],
      ),
    );
  }
}
