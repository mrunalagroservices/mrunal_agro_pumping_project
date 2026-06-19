import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';

class AccountSettingsScreen extends StatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  State<AccountSettingsScreen> createState() => _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends State<AccountSettingsScreen> {
  bool _showBanner = true;

  void _comingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$feature — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final unconfirmedEmail = user?.email.isNotEmpty == true; // always show as demo banner

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Row(
              children: [
                _CircleBackButton(onTap: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Account settings',
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
            const SizedBox(height: 18),

            // ── Dismissible banner with fade+collapse animation ─────────────
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeInOut,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 220),
                opacity: _showBanner ? 1 : 0,
                child: _showBanner
                    ? Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: unconfirmedEmail
                            ? _Banner(
                                icon: Icons.mail_outline,
                                title: 'Confirm your email address',
                                subtitle: "We'll send a code to your inbox.",
                                actionLabel: 'Confirm email',
                                onAction: () => _comingSoon('Email confirmation'),
                                onDismiss: () => setState(() => _showBanner = false),
                              )
                            : _Banner(
                                icon: Icons.notifications_active_outlined,
                                title: 'Turn on notifications',
                                subtitle: "Don't miss updates about orders and pump alerts.",
                                actionLabel: 'Yes, notify me',
                                onAction: () => _comingSoon('Notifications'),
                                onDismiss: () => setState(() => _showBanner = false),
                              ),
                      )
                    : const SizedBox.shrink(),
              ),
            ),

            // ── Settings list ───────────────────────────────────────────────
            _SettingsRow(icon: Icons.person_outline, label: 'Personal information', onTap: () => _comingSoon('Personal information')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.shield_outlined, label: 'Login & security', onTap: () => _comingSoon('Login & security')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.front_hand_outlined, label: 'Privacy', onTap: () => _comingSoon('Privacy')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.notifications_outlined, label: 'Notifications', onTap: () => _comingSoon('Notifications')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.credit_card_outlined, label: 'Payments', onTap: () => _comingSoon('Payments')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.language_outlined, label: 'Language', onTap: () => _comingSoon('Language')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.handshake_outlined, label: 'Order permissions', onTap: () => _comingSoon('Order permissions')),
          ],
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;
  final VoidCallback onDismiss;

  const _Banner({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onAction,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primary700),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
                  ],
                ),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: onDismiss,
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.textPrimary,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12),
                side: const BorderSide(color: AppColors.cardBorder),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SettingsRow({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.textPrimary),
      title: Text(label, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.slate400),
      onTap: onTap,
    );
  }
}

class _CircleBackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _CircleBackButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: const BoxDecoration(color: AppColors.slate50, shape: BoxShape.circle),
        child: const Icon(Icons.arrow_back, size: 20, color: AppColors.textPrimary),
      ),
    );
  }
}
