import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../services/api_client.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const fieldBorder = Color(0xFFB0B0B0);
}

class CreditsCouponsScreen extends StatefulWidget {
  const CreditsCouponsScreen({super.key});

  @override
  State<CreditsCouponsScreen> createState() => _CreditsCouponsScreenState();
}

class _CreditsCouponsScreenState extends State<CreditsCouponsScreen> {
  List<Map<String, dynamic>>? _coupons;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final coupons = await context.read<AppState>().fetchMyCoupons();
      if (!mounted) return;
      setState(() => _coupons = coupons);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load your coupons.');
    }
  }

  void _comingSoon(String f) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$f — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _openAddCoupon() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => const _AddCouponSheet(),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Align(alignment: Alignment.topLeft, child: _CircleBack(onTap: () => Navigator.pop(context))),
            const SizedBox(height: 18),
            const Text('Credits and coupons',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
            const SizedBox(height: 28),

            const Text('Gift credit', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: _P.text)),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Current balance', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text)),
                const Text('₹0.00', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
              ],
            ),
            const SizedBox(height: 16),
            _DarkButton(label: 'Add gift card', onTap: () => _comingSoon('Gift cards')),

            const SizedBox(height: 28),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 28),

            const Text('Coupons', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: _P.text)),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Your coupons', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text)),
                Text('${_coupons?.length ?? 0}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text, decoration: TextDecoration.underline)),
              ],
            ),
            const SizedBox(height: 14),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
              ),

            if (_coupons == null)
              const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: CircularProgressIndicator()))
            else if (_coupons!.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 4, horizontal: 0),
                child: Text("You don't have any saved coupons yet.", style: TextStyle(fontSize: 12, color: _P.subtext)),
              )
            else
              ..._coupons!.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _CouponCard(coupon: c),
                  )),

            const SizedBox(height: 16),
            _DarkButton(label: 'Add coupon', onTap: _openAddCoupon),
          ],
        ),
      ),
    );
  }
}

class _CouponCard extends StatelessWidget {
  final Map<String, dynamic> coupon;
  const _CouponCard({required this.coupon});

  @override
  Widget build(BuildContext context) {
    final code = coupon['code'] as String? ?? '';
    final expired = coupon['expired'] == true || coupon['is_active'] != true;
    final type = coupon['type'] as String?;
    final value = coupon['value'];
    final minOrder = coupon['min_order'];

    final description = expired
        ? 'This coupon is no longer active.'
        : type == 'percent'
            ? 'Get $value% off${minOrder != null && minOrder > 0 ? ' on orders above ₹$minOrder' : ''}.'
            : 'Get ₹$value off${minOrder != null && minOrder > 0 ? ' on orders above ₹$minOrder' : ''}.';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F7),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(expired ? '🏷️' : '🟢', style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(code, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.text)),
                const SizedBox(height: 2),
                Text(description, style: const TextStyle(fontSize: 11, color: _P.subtext)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AddCouponSheet extends StatefulWidget {
  const _AddCouponSheet();

  @override
  State<_AddCouponSheet> createState() => _AddCouponSheetState();
}

class _AddCouponSheetState extends State<_AddCouponSheet> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _apply() async {
    final code = _controller.text.trim();
    if (code.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AppState>().saveCoupon(code);
      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      if (!mounted) return;
      setState(() { _loading = false; _error = 'Could not reach the server.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Coupons', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
              ),
              InkWell(
                onTap: () => Navigator.pop(context, false),
                borderRadius: BorderRadius.circular(20),
                child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, color: _P.text)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              hintText: 'Enter a coupon code',
              hintStyle: const TextStyle(color: _P.subtext),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
              focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: _P.text, width: 1.5)),
            ),
            onSubmitted: (_) => _apply(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _apply,
              style: ElevatedButton.styleFrom(
                backgroundColor: _P.text,
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFFDDDDDD),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Apply', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}

class _DarkButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _DarkButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: _P.text,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
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
