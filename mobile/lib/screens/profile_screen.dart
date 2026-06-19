import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import 'account_settings_screen.dart';

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
    final canPop = Navigator.canPop(context);
    final unresolvedAlerts = state.alerts.where((a) => !a.isResolved).length;

    final yearsOnApp = user?.createdAt != null
        ? (DateTime.now().difference(user!.createdAt!).inDays / 365).floor()
        : 0;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            // ── Header row: title + back/bell ───────────────────────────────
            Row(
              children: [
                if (canPop) _CircleIcon(icon: Icons.arrow_back, onTap: () => Navigator.pop(context)),
                if (canPop) const SizedBox(width: 12),
                const Text('Profile', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
                const Spacer(),
                _CircleIcon(
                  icon: Icons.notifications_none_rounded,
                  badge: unresolvedAlerts > 0,
                  onTap: widget.onViewMessages ?? () {},
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ── Header card: avatar + stats ──────────────────────────────────
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 4,
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 40,
                          backgroundColor: AppColors.primary100,
                          child: Text(
                            (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : '?',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(user?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(
                          user?.role.toUpperCase() ?? '',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 5,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _StatRow(value: '${state.orders.length}', label: state.orders.length == 1 ? 'Order' : 'Orders'),
                        const Divider(height: 22),
                        _StatRow(value: '${state.farms.length}', label: state.farms.length == 1 ? 'Farm' : 'Farms'),
                        const Divider(height: 22),
                        _StatRow(value: '$yearsOnApp', label: yearsOnApp == 1 ? 'Year on Mrunal' : 'Years on Mrunal'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Promo cards row ──────────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _PromoCard(
                    icon: Icons.shopping_bag_outlined,
                    iconColor: AppColors.primary700,
                    iconBg: AppColors.primary50,
                    label: 'My Orders',
                    badge: 'NEW',
                    onTap: widget.onViewOrders ?? () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _PromoCard(
                    icon: Icons.agriculture_outlined,
                    iconColor: const Color(0xFFB45309),
                    iconBg: const Color(0xFFFFF7ED),
                    label: 'My Farms',
                    badge: 'NEW',
                    onTap: () => _comingSoon('Farms overview'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Wide promo card ──────────────────────────────────────────────
            _WidePromoCard(
              icon: Icons.add_circle_outline,
              title: 'Add a Farm',
              subtitle: "It's easy to add a farm and start monitoring your pumps.",
              onTap: () => _comingSoon('Add a farm'),
            ),
            const SizedBox(height: 24),

            // ── Settings list (flat, no card) ───────────────────────────────
            _SettingsRow(
              icon: Icons.settings_outlined,
              label: 'Account settings',
              showDot: true,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AccountSettingsScreen()),
              ),
            ),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.help_outline, label: 'Get help', onTap: () => _comingSoon('Help center')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.person_outline, label: 'View profile', onTap: () => _comingSoon('View profile')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.front_hand_outlined, label: 'Privacy', onTap: () => _comingSoon('Privacy')),

            const SizedBox(height: 18),
            const Divider(height: 1),
            const SizedBox(height: 6),

            _SettingsRow(icon: Icons.group_outlined, label: 'Refer a friend', onTap: () => _comingSoon('Referrals')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.support_agent_outlined, label: 'Find support', onTap: () => _comingSoon('Support')),
            const Divider(height: 1),
            _SettingsRow(icon: Icons.menu_book_outlined, label: 'Legal', onTap: () => _comingSoon('Legal')),
            const Divider(height: 1),
            _SettingsRow(
              icon: Icons.logout,
              label: 'Log out',
              iconColor: AppColors.offlineRed,
              labelColor: AppColors.offlineRed,
              showChevron: false,
              onTap: () => context.read<AppState>().logout(),
            ),
          ],
        ),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
      ],
    );
  }
}

class _PromoCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String? badge;
  final VoidCallback onTap;

  const _PromoCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.cardBorder),
          ),
          padding: const EdgeInsets.all(16),
          child: Stack(
            children: [
              if (badge != null)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(20)),
                    child: Text(badge!, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
                    child: Icon(icon, color: iconColor, size: 22),
                  ),
                  const SizedBox(height: 14),
                  Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WidePromoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _WidePromoCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.cardBorder),
          ),
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(color: AppColors.primary50, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: AppColors.primary700, size: 26),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5, height: 1.3)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool showDot;
  final bool showChevron;
  final Color? iconColor;
  final Color? labelColor;
  final VoidCallback onTap;

  const _SettingsRow({
    required this.icon,
    required this.label,
    this.showDot = false,
    this.showChevron = true,
    this.iconColor,
    this.labelColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(icon, color: iconColor ?? AppColors.textPrimary),
          if (showDot)
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                width: 9,
                height: 9,
                decoration: const BoxDecoration(color: AppColors.offlineRed, shape: BoxShape.circle),
              ),
            ),
        ],
      ),
      title: Text(
        label,
        style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w500, color: labelColor ?? AppColors.textPrimary),
      ),
      trailing: showChevron ? const Icon(Icons.chevron_right, color: AppColors.slate400) : null,
      onTap: onTap,
    );
  }
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final bool badge;
  final VoidCallback onTap;
  const _CircleIcon({required this.icon, this.badge = false, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 40,
        height: 40,
        decoration: const BoxDecoration(color: AppColors.slate50, shape: BoxShape.circle),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 20, color: AppColors.textPrimary),
            if (badge)
              Positioned(
                top: 8,
                right: 9,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: AppColors.offlineRed, shape: BoxShape.circle),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
