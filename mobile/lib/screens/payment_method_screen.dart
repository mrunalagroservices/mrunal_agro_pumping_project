import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import '../config/theme.dart';

const _methods = [
  ('cod', 'pm_cod', 'pm_cod_sub', true),
  ('upi', 'pm_upi', 'pm_upi_sub', false),
  ('card', 'pm_card', 'pm_card_sub', false),
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
    final err = await context.read<AppState>().updateProfile(
      preferredPaymentMethod: value,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final selected =
        context.watch<AppState>().user?.preferredPaymentMethod ?? 'cod';

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
                  Expanded(
                    child: Text(
                      context.tr('pm_title'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: AppColors.text,
                      ),
                    ),
                  ),
                  const LanguageSwitcher(size: 36),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: AppColors.divider),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  context.tr('pm_default_hint'),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.subtext,
                    height: 1.4,
                  ),
                ),
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _methods.length,
                separatorBuilder: (_, __) => const Divider(
                  height: 1,
                  thickness: 1,
                  color: AppColors.divider,
                  indent: 20,
                  endIndent: 20,
                ),
                itemBuilder: (context, i) {
                  final (value, labelKey, subtitleKey, enabled) = _methods[i];
                  return Opacity(
                    opacity: enabled ? 1 : 0.5,
                    child: InkWell(
                      onTap: !enabled || _saving ? null : () => _select(value),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    context.tr(labelKey),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.text,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    context.tr(subtitleKey),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.subtext,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (!enabled)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.divider,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  context.tr('pm_coming_soon'),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.subtext,
                                  ),
                                ),
                              )
                            else
                              Radio<String>(
                                value: value,
                                groupValue: selected,
                                onChanged: _saving ? null : (v) => _select(v!),
                                activeColor: AppColors.text,
                              ),
                          ],
                        ),
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
        decoration: const BoxDecoration(
          color: AppColors.chip,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.arrow_back, size: 20, color: AppColors.text),
      ),
    );
  }
}
