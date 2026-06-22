import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
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
    _toast(err ?? context.tr('privacy_export_toast'));
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
        title: Text(context.tr('privacy_delete_dialog_title')),
        content: Text(context.tr('privacy_delete_dialog_body')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr('privacy_cancel'))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('privacy_continue'), style: const TextStyle(color: _P.danger, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
    if (firstConfirm != true || !mounted) return;

    final secondConfirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr('privacy_sure_title')),
        content: Text(context.tr('privacy_sure_body')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr('privacy_cancel'))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('privacy_delete_dialog_confirm'), style: const TextStyle(color: _P.danger, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
    if (secondConfirm != true || !mounted) return;

    setState(() => _busy = true);
    final err = await context.read<AppState>().requestAccountDeletion();
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(err ?? context.tr('privacy_deletion_requested_toast'));
  }

  Future<void> _cancelDeletion() async {
    setState(() => _busy = true);
    final err = await context.read<AppState>().cancelAccountDeletion();
    if (!mounted) return;
    setState(() => _busy = false);
    _toast(err ?? context.tr('privacy_deletion_cancelled_toast'));
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
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
                  Expanded(
                    child: Text(context.tr('privacy_title'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const LanguageSwitcher(size: 36),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                children: [
                  Text(context.tr('privacy_data_privacy'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
                  const SizedBox(height: 14),

                  _OutlinedRow(
                    label: context.tr('privacy_policy'),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => LegalDocScreen(slug: 'privacy-policy', title: context.tr('privacy_policy'))),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _OutlinedRow(
                    label: context.tr('privacy_request_data'),
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
                            Text(context.tr('privacy_help_improve'),
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                            const SizedBox(height: 4),
                            Text(
                              context.tr('privacy_help_improve_sub'),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.35),
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
                            '${context.tr('privacy_deletion_requested')}'
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
                            child: Text(context.tr('privacy_cancel_deletion'), style: const TextStyle(fontWeight: FontWeight.w500)),
                          ),
                        ],
                      ),
                    ),
                  ] else
                    _OutlinedRow(
                      label: context.tr('privacy_delete_account'),
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
