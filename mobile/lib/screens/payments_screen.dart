import 'package:flutter/material.dart';
import '../l10n/tr_extension.dart';
import '../widgets/language_switcher.dart';
import 'credits_coupons_screen.dart';
import 'orders_screen.dart';
import 'payment_method_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const badge = Color(0xFFE61E4D);
}

class PaymentsScreen extends StatelessWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header: back + fixed currency badge ─────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 20, 8),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  const Spacer(),
                  const LanguageSwitcher(),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(color: _P.circleBtn, borderRadius: BorderRadius.circular(24)),
                    child: const Text('₹ – INR', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  Text(context.tr('payments_title'),
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
                  const SizedBox(height: 28),

                  Text(context.tr('payments_your_account'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                  const SizedBox(height: 14),

                  _OutlinedRow(
                    icon: Icons.payments_outlined,
                    label: context.tr('payments_methods'),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentMethodScreen())),
                  ),
                  const SizedBox(height: 12),
                  _OutlinedRow(
                    icon: Icons.receipt_long_outlined,
                    label: context.tr('payments_your_payments'),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen())),
                  ),
                  const SizedBox(height: 12),
                  _OutlinedRow(
                    icon: Icons.confirmation_number_outlined,
                    label: context.tr('payments_credits_coupons'),
                    badge: context.tr('payments_new_badge'),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreditsCouponsScreen())),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutlinedRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? badge;
  final VoidCallback onTap;
  const _OutlinedRow({required this.icon, required this.label, this.badge, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _P.divider),
        ),
        child: Row(
          children: [
            Icon(icon, size: 22, color: _P.text),
            const SizedBox(width: 14),
            Expanded(
              child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text)),
            ),
            if (badge != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: _P.badge, borderRadius: BorderRadius.circular(20)),
                child: Text(badge!, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500)),
              ),
              const SizedBox(width: 8),
            ],
            const Icon(Icons.chevron_right, color: _P.subtext),
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
