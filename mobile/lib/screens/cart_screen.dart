import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import '../services/api_client.dart';
import 'payment_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const fieldBorder = Color(0xFFB0B0B0);
  static const green = Color(0xFF15803D);
}

class CartScreen extends StatefulWidget {
  final Map<int, int> cart;
  final void Function(int id, int qty) onUpdate;
  final VoidCallback onOrderPlaced;

  const CartScreen({super.key, required this.cart, required this.onUpdate, required this.onOrderPlaced});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  late Map<int, int> _cart;

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _line1 = TextEditingController();
  final _line2 = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _pincode = TextEditingController();

  final _couponController = TextEditingController();
  Map<String, dynamic>? _appliedCoupon; // {coupon: {...}, discount: ...}
  bool _applyingCoupon = false;
  String? _couponError;

  @override
  void initState() {
    super.initState();
    _cart = Map.from(widget.cart);
    final user = context.read<AppState>().user;
    _name.text = user?.name ?? '';
    _phone.text = user?.phone ?? '';
    final addr = user?.residentialAddress ?? user?.postalAddress;
    if (addr != null) {
      _line1.text = addr.line1;
      _line2.text = addr.line2 ?? '';
      _city.text = addr.city;
      _state.text = addr.state;
      _pincode.text = addr.pincode;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _line1.dispose();
    _line2.dispose();
    _city.dispose();
    _state.dispose();
    _pincode.dispose();
    _couponController.dispose();
    super.dispose();
  }

  List<MapEntry<int, int>> get _entries => _cart.entries.toList();

  double get _subtotal => _entries.fold(0, (sum, e) {
        final p = kProducts.firstWhere((p) => p.id == e.key);
        return sum + p.price * e.value;
      });

  double get _discount => (_appliedCoupon?['discount'] as num?)?.toDouble() ?? 0;

  DeliveryAddress get _address => DeliveryAddress(
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        line1: _line1.text.trim(),
        line2: _line2.text.trim().isEmpty ? null : _line2.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
        pincode: _pincode.text.trim(),
      );

  void _changeQty(int id, int delta) {
    setState(() {
      final newQty = (_cart[id] ?? 0) + delta;
      if (newQty <= 0) {
        _cart.remove(id);
      } else {
        _cart[id] = newQty;
      }
      widget.onUpdate(id, _cart[id] ?? 0);
    });
  }

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;
    setState(() { _applyingCoupon = true; _couponError = null; });
    try {
      final result = await context.read<AppState>().checkCoupon(code, _subtotal);
      if (!mounted) return;
      setState(() {
        _appliedCoupon = {'code': code.toUpperCase(), ...result};
        _applyingCoupon = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() { _applyingCoupon = false; _couponError = e.message; });
    } catch (_) {
      if (!mounted) return;
      setState(() { _applyingCoupon = false; _couponError = 'Could not reach the server.'; });
    }
  }

  void _removeCoupon() {
    setState(() {
      _appliedCoupon = null;
      _couponController.clear();
      _couponError = null;
    });
  }

  void _continueToPay() {
    if (_entries.isEmpty) return;
    if (!_address.isComplete) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in your full delivery address')),
      );
      return;
    }
    final items = _entries.map((e) {
      final p = kProducts.firstWhere((p) => p.id == e.key);
      return {
        'product_name': p.name,
        'category': p.category,
        'unit': p.unit,
        'price': p.price,
        'original_price': p.originalPrice,
        'qty': e.value,
      };
    }).toList();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentScreen(
          items: items,
          address: _address,
          subtotal: _subtotal,
          discount: _discount,
          couponCode: _appliedCoupon?['code'] as String?,
          onOrderPlaced: () {
            setState(() => _cart.clear());
            widget.onOrderPlaced();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: _P.text,
        elevation: 0,
        title: Text('My Cart (${_cart.values.fold(0, (a, b) => a + b)})',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
      ),
      body: _entries.isEmpty
          ? const _EmptyCart()
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      ..._entries.map((e) {
                        final p = kProducts.firstWhere((p) => p.id == e.key);
                        return _CartItemRow(
                          product: p,
                          qty: e.value,
                          onIncrement: () => _changeQty(p.id, 1),
                          onDecrement: () => _changeQty(p.id, -1),
                        );
                      }),
                      const SizedBox(height: 8),
                      const Divider(height: 1, thickness: 1, color: _P.divider),
                      const SizedBox(height: 20),

                      const Text('Deliver to', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
                      const SizedBox(height: 14),
                      Row(children: [
                        Expanded(child: _Field(label: 'Full name', controller: _name)),
                        const SizedBox(width: 10),
                        Expanded(child: _Field(label: 'Phone', controller: _phone, keyboardType: TextInputType.phone)),
                      ]),
                      const SizedBox(height: 12),
                      _Field(label: 'Address line 1', controller: _line1),
                      const SizedBox(height: 12),
                      _Field(label: 'Address line 2 (optional)', controller: _line2),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(child: _Field(label: 'City', controller: _city)),
                        const SizedBox(width: 10),
                        Expanded(child: _Field(label: 'State', controller: _state)),
                      ]),
                      const SizedBox(height: 12),
                      _Field(label: 'Pincode', controller: _pincode, keyboardType: TextInputType.number),

                      const SizedBox(height: 24),
                      const Divider(height: 1, thickness: 1, color: _P.divider),
                      const SizedBox(height: 20),

                      const Text('Coupon', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
                      const SizedBox(height: 14),
                      if (_appliedCoupon != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              const Icon(Icons.local_offer_outlined, size: 18, color: _P.green),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${_appliedCoupon!['code']} applied — you saved ₹${_discount.toStringAsFixed(0)}',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.green),
                                ),
                              ),
                              InkWell(onTap: _removeCoupon, child: const Icon(Icons.close, size: 18, color: _P.green)),
                            ],
                          ),
                        )
                      else
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _couponController,
                                textCapitalization: TextCapitalization.characters,
                                decoration: InputDecoration(
                                  hintText: 'Enter coupon code',
                                  hintStyle: const TextStyle(color: _P.subtext),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
                                  focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: _P.text, width: 1.5)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            SizedBox(
                              height: 48,
                              child: ElevatedButton(
                                onPressed: _applyingCoupon ? null : _applyCoupon,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _P.text,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: _applyingCoupon
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : const Text('Apply'),
                              ),
                            ),
                          ],
                        ),
                      if (_couponError != null) ...[
                        const SizedBox(height: 8),
                        Text(_couponError!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
                      ],

                      const SizedBox(height: 24),
                      const Divider(height: 1, thickness: 1, color: _P.divider),
                      const SizedBox(height: 20),

                      const Text('Order summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
                      const SizedBox(height: 14),
                      _SummaryRow(label: 'Subtotal', value: '₹${_subtotal.toStringAsFixed(0)}'),
                      if (_discount > 0)
                        _SummaryRow(label: 'Coupon discount', value: '−₹${_discount.toStringAsFixed(0)}', valueColor: _P.green),
                      const SizedBox(height: 4),
                      const Text('Delivery charge is calculated on the next step based on payment method.',
                          style: TextStyle(fontSize: 12, color: _P.subtext)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: _P.divider)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('₹${(_subtotal - _discount).toStringAsFixed(0)}',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
                            const Text('+ delivery', style: TextStyle(fontSize: 12, color: _P.subtext)),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: _continueToPay,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _P.text,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Continue to Pay', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _CartItemRow extends StatelessWidget {
  final Product product;
  final int qty;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  const _CartItemRow({required this.product, required this.qty, required this.onIncrement, required this.onDecrement});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(color: product.iconBg, borderRadius: BorderRadius.circular(12)),
            alignment: Alignment.center,
            child: Icon(product.icon, color: product.iconColor, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text)),
                const SizedBox(height: 2),
                Text(product.unit, style: const TextStyle(fontSize: 13, color: _P.subtext)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text('₹${(product.price * qty).toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: _P.text)),
                    const Spacer(),
                    _QtyStepper(qty: qty, onIncrement: onIncrement, onDecrement: onDecrement),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  final int qty;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  const _QtyStepper({required this.qty, required this.onIncrement, required this.onDecrement});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: _P.fieldBorder), borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(onTap: onDecrement, child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.remove, size: 16))),
          SizedBox(width: 28, child: Text('$qty', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600))),
          InkWell(onTap: onIncrement, child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.add, size: 16))),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  const _Field({required this.label, required this.controller, this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 13, color: _P.subtext),
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
  final Color? valueColor;
  const _SummaryRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text)),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: valueColor ?? _P.text)),
        ],
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 48, color: _P.subtext),
            const SizedBox(height: 14),
            const Text('Your cart is empty', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w400, color: _P.text)),
          ],
        ),
      ),
    );
  }
}
