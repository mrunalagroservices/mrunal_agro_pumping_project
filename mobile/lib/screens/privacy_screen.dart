import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import 'legal_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const border = Color(0xFFDDDDDD);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const danger = Color(0xFFDC2626);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  bool _busy = false;

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _requestDataExport() async {
    setState(() => _busy = true);
    final err = await context.read<AppState>().requestDataExport();
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(err ?? "Request received — we'll email your data export when it's ready.");
  }

  Future<void> _toggleAnalytics(bool value) async {
    final err = await context.read<AppState>().updateProfile(analyticsOptIn: value);
    if (!mounted) return;
    if (err != null) _toast(err);
  }

  Future<void> _confirmDelete() async {
    final firstConfirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This will schedule your account for deletion. You can cancel anytime before it is processed. '
          'Your farms, devices, and order history will eventually be permanently removed.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Continue', style: TextStyle(color: _P.danger, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
    if (firstConfirm != true || !mounted) return;

    final secondConfirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Are you absolutely sure?'),
        content: const Text('This action cannot be undone once processed. Type nothing — just confirm to proceed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete my account', style: TextStyle(color: _P.danger, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
    if (secondConfirm != true || !mounted) return;

    setState(() => _busy = true);
    final err = await context.read<AppState>().requestAccountDeletion();
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(err ?? 'Account deletion requested.');
  }

  Future<void> _cancelDeletion() async {
    setState(() => _busy = true);
    final err = await context.read<AppState>().cancelAccountDeletion();
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(err ?? 'Deletion request cancelled.');
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final deletionPending = user?.deletionPending ?? false;
    final deletionDate = user?.deletionRequestedAt;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ── Slim centered-title header ───────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  const Expanded(
                    child: Text('Privacy',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                children: [
                  const Text('Data privacy', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
                  const SizedBox(height: 14),

                  _OutlinedRow(
                    label: 'Privacy Policy',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LegalDocScreen(doc: privacyPolicyDoc)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _OutlinedRow(
                    label: 'Request my personal data',
                    onTap: _busy ? null : _requestDataExport,
                  ),
                  const SizedBox(height: 24),

                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Help improve the app',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                            const SizedBox(height: 4),
                            const Text(
                              "When this is on, we use anonymous usage data to improve features across "
                              "Mrunal Agro — farm management, irrigation scheduling, and the marketplace.",
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.35),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Switch(
                        value: user?.analyticsOptIn ?? true,
                        onChanged: _busy ? null : _toggleAnalytics,
                        thumbColor: const WidgetStatePropertyAll(Colors.white),
                        activeTrackColor: _P.text,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (deletionPending) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Account deletion requested'
                            '${deletionDate != null ? ' on ${deletionDate.day} ${_months[deletionDate.month - 1]} ${deletionDate.year}' : ''}.',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.danger),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            onPressed: _busy ? null : _cancelDeletion,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _P.text,
                              side: const BorderSide(color: _P.border),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Cancel deletion', style: TextStyle(fontWeight: FontWeight.w500)),
                          ),
                        ],
                      ),
                    ),
                  ] else
                    _OutlinedRow(
                      label: 'Delete my account',
                      labelColor: _P.danger,
                      onTap: _busy ? null : _confirmDelete,
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
  final String label;
  final Color? labelColor;
  final VoidCallback? onTap;
  const _OutlinedRow({required this.label, this.labelColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _P.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: labelColor ?? _P.text)),
            ),
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
