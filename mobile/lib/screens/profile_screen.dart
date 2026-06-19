import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback? onViewOrders;
  final VoidCallback? onViewMessages;

  const ProfileScreen({super.key, this.onViewOrders, this.onViewMessages});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = context.read<AppState>();
      if (state.orders.isEmpty) state.loadOrders();
    });
  }

  void _comingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$feature — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user;

    final yearsOnApp = user?.createdAt != null
        ? (DateTime.now().difference(user!.createdAt!).inDays / 365).floor()
        : 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          // ── Header card ──────────────────────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 4,
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 38,
                          backgroundColor: AppColors.primary100,
                          child: Text(
                            (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : '?',
                            style: const TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(user?.name ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(
                          user?.role.toUpperCase() ?? '',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 11, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 5,
                    child: Column(
                      children: [
                        _StatRow(value: '${state.orders.length}', label: state.orders.length == 1 ? 'Order' : 'Orders'),
                        const Divider(height: 18),
                        _StatRow(value: '${state.farms.length}', label: state.farms.length == 1 ? 'Farm' : 'Farms'),
                        const Divider(height: 18),
                        _StatRow(value: '$yearsOnApp', label: yearsOnApp == 1 ? 'Year on Mrunal' : 'Years on Mrunal'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Quick links ──────────────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _QuickCard(
                  emoji: '📦',
                  label: 'My Orders',
                  onTap: widget.onViewOrders ?? () {},
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickCard(
                  emoji: '💬',
                  label: 'Messages',
                  onTap: widget.onViewMessages ?? () {},
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Settings list ───────────────────────────────────────────────
          Card(
            child: Column(
              children: [
                _SettingsTile(
                  icon: Icons.settings_outlined,
                  label: 'Account settings',
                  onTap: () => _comingSoon('Account settings'),
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.help_outline,
                  label: 'Get help',
                  onTap: () => _comingSoon('Help center'),
                ),
                const Divider(height: 1),
                _SettingsTile(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  trailing: user?.email,
                ),
                if (user?.phone != null && user!.phone!.isNotEmpty) ...[
                  const Divider(height: 1),
                  _SettingsTile(
                    icon: Icons.phone_outlined,
                    label: 'Phone',
                    trailing: user.phone,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => context.read<AppState>().logout(),
            icon: const Icon(Icons.logout, color: AppColors.offlineRed),
            label: const Text('Log out', style: TextStyle(color: AppColors.offlineRed)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: AppColors.offlineRed),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String value;
  final String label;
  const _StatRow({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ),
      ],
    );
  }
}

class _QuickCard extends StatelessWidget {
  final String emoji;
  final String label;
  final VoidCallback onTap;
  const _QuickCard({required this.emoji, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 26)),
              const SizedBox(height: 10),
              Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.label,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textPrimary),
      title: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
      trailing: trailing != null
          ? Text(trailing!, style: TextStyle(color: AppColors.textSecondary, fontSize: 13))
          : (onTap != null ? const Icon(Icons.chevron_right, color: AppColors.slate400) : null),
      onTap: onTap,
    );
  }
}
