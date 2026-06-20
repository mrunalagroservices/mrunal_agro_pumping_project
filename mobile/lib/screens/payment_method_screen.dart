import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

const _methods = [
  ('cod', 'Cash on delivery', 'Pay when your order arrives'),
  ('upi', 'UPI', 'Pay instantly via UPI app'),
  ('card', 'Card', 'Visa, Mastercard, RuPay'),
];

class PaymentMethodScreen extends StatefulWidget {
  const PaymentMethodScreen({super.key});

  @override
  State<PaymentMethodScreen> createState() => _PaymentMethodScreenState();
}

class _PaymentMethodScreenState extends State<PaymentMethodScreen> {
  bool _saving = false;

  Future<void> _select(String value) async {
    final current = context.read<AppState>().user?.preferredPaymentMethod;
    if (current == value) return;
    setState(() => _saving = true);
    final err = await context.read<AppState>().updateProfile(preferredPaymentMethod: value);
    if (!mounted) return;
    setState(() => _saving = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = context.watch<AppState>().user?.preferredPaymentMethod ?? 'cod';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 20, 8),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  const Expanded(
                    child: Text('Payment methods',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('This is used as your default at checkout. You can still '
                    'switch payment method on any individual order.',
                    style: TextStyle(fontSize: 11, color: _P.subtext, height: 1.4)),
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _methods.length,
                separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, color: _P.divider, indent: 20, endIndent: 20),
                itemBuilder: (context, i) {
                  final (value, label, subtitle) = _methods[i];
                  return InkWell(
                    onTap: _saving ? null : () => _select(value),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                                const SizedBox(height: 2),
                                Text(subtitle, style: const TextStyle(fontSize: 11, color: _P.subtext)),
                              ],
                            ),
                          ),
                          Radio<String>(
                            value: value,
                            groupValue: selected,
                            onChanged: _saving ? null : (v) => _select(v!),
                            activeColor: _P.text,
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
        child: const Icon(Icons.arrow_back, size: 20, color: _P.text),
      ),
    );
  }
}
