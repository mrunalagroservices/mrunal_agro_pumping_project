import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import 'account_settings_screen.dart';
import 'legal_screen.dart';
import 'privacy_screen.dart';
import 'support_screen.dart';
import '../config/theme.dart';

/// Palette tuned to match the reference profile design.

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
      SnackBar(
        content: Text(
          context.tr('profile_coming_soon').replaceAll('{feature}', feature),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final user = state.user;
    final unresolved = state.notifications
        .where((n) => n.isUnresolvedAlert)
        .length;

    final yearsOnApp = user?.createdAt != null
        ? (DateTime.now().difference(user!.createdAt!).inDays / 365).floor()
        : 0;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            // ── Title + bell ─────────────────────────────────────────────
            Row(
              children: [
                if (Navigator.canPop(context)) ...[
                  _CircleIcon(
                    icon: Icons.arrow_back,
                    onTap: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 12),
                ],
                Text(
                  context.tr('profile_title'),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w500,
                    color: AppColors.text,
                    letterSpacing: -0.3,
                  ),
                ),
                const Spacer(),
                const LanguageSwitcher(size: 36),
                const SizedBox(width: 10),
                _CircleIcon(
                  icon: Icons.notifications_none_rounded,
                  badge: unresolved > 0,
                  onTap: widget.onViewMessages ?? () {},
                ),
              ],
            ),
            const SizedBox(height: 22),

            // ── Header card: avatar + stats ──────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    flex: 5,
                    child: Column(
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: const BoxDecoration(
                            color: AppColors.avatarBg,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            (user?.name.isNotEmpty ?? false)
                                ? user!.name[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.w500,
                              color: AppColors.avatarFg,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          user?.name ?? '',
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w500,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _roleLabel(context, user?.role),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.subtext,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 5,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Stat(
                          value: '${state.orders.length}',
                          label: state.orders.length == 1
                              ? context.tr('profile_order')
                              : context.tr('profile_orders'),
                        ),
                        const _StatDivider(),
                        _Stat(
                          value: '${state.farms.length}',
                          label: state.farms.length == 1
                              ? context.tr('profile_farm')
                              : context.tr('profile_farms'),
                        ),
                        const _StatDivider(),
                        _Stat(
                          value: '$yearsOnApp',
                          label: yearsOnApp == 1
                              ? context.tr('profile_year_on_app')
                              : context.tr('profile_years_on_app'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // ── Two promo cards with NEW badge ───────────────────────────
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _PromoCard(
                      tileBg: const Color(0xFFFFF1F3),
                      emoji: '📦',
                      label: context.tr('profile_my_orders'),
                      onTap: widget.onViewOrders ?? () {},
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: _PromoCard(
                      tileBg: const Color(0xFFEFF6EF),
                      emoji: '🌾',
                      label: context.tr('profile_my_farms'),
                      onTap: () =>
                          _comingSoon(context.tr('profile_farms_overview')),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // ── Wide promo card ──────────────────────────────────────────
            _WideCard(
              emoji: '🤝',
              title: context.tr('profile_be_a_dealer'),
              subtitle: context.tr('profile_be_a_dealer_sub'),
              onTap: () => _comingSoon(context.tr('profile_be_a_dealer')),
            ),
            const SizedBox(height: 18),

            // ── Menu list ────────────────────────────────────────────────
            _MenuRow(
              icon: Icons.settings_outlined,
              label: context.tr('profile_account_settings'),
              showDot: true,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const AccountSettingsScreen(),
                  ),
                );
              },
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.help_outline,
              label: context.tr('profile_get_help'),
              onTap: () => _comingSoon(context.tr('profile_help_center')),
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.person_outline,
              label: context.tr('profile_view_profile'),
              onTap: () => _comingSoon(context.tr('profile_view_profile')),
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.front_hand_outlined,
              label: context.tr('profile_privacy'),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PrivacyScreen()),
                );
              },
            ),

            const SizedBox(height: 14),
            const Divider(height: 1, thickness: 1, color: AppColors.divider),
            const SizedBox(height: 14),

            _MenuRow(
              icon: Icons.group_add_outlined,
              label: context.tr('profile_refer_friend'),
              onTap: () => _comingSoon(context.tr('profile_referrals')),
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.support_agent_outlined,
              label: context.tr('profile_find_support'),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SupportScreen()),
                );
              },
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.menu_book_outlined,
              label: context.tr('profile_legal'),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LegalScreen()),
                );
              },
            ),
            const _MenuDivider(),
            _MenuRow(
              icon: Icons.meeting_room_outlined,
              label: context.tr('profile_logout'),
              showChevron: false,
              onTap: () => context.read<AppState>().logout(),
            ),
          ],
        ),
      ),
    );
  }

  String _roleLabel(BuildContext context, String? role) {
    if (role == null || role.isEmpty) return context.tr('profile_member');
    return role[0].toUpperCase() + role.substring(1);
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  const _Stat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w500,
            color: AppColors.text,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.text,
          ),
        ),
      ],
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 12),
      child: Divider(height: 1, thickness: 1, color: AppColors.divider),
    );
  }
}

class _PromoCard extends StatelessWidget {
  final Color tileBg;
  final String emoji;
  final String label;
  final VoidCallback onTap;

  const _PromoCard({
    required this.tileBg,
    required this.emoji,
    required this.label,
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
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // badge row
              Align(
                alignment: Alignment.topRight,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.newBadge,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    context.tr('profile_new_badge'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: tileBg,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  alignment: Alignment.center,
                  child: Text(emoji, style: const TextStyle(fontSize: 30)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                  color: AppColors.text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WideCard extends StatelessWidget {
  final String emoji;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _WideCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
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
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.fromLTRB(16, 18, 18, 18),
          child: Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Text(emoji, style: const TextStyle(fontSize: 28)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 15,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: AppColors.subtext,
                        fontWeight: FontWeight.w400,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
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

class _MenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool showDot;
  final bool showChevron;
  final VoidCallback onTap;

  const _MenuRow({
    required this.icon,
    required this.label,
    this.showDot = false,
    this.showChevron = true,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(icon, color: AppColors.text, size: 26),
                if (showDot)
                  Positioned(
                    top: -1,
                    right: -2,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.text,
                ),
              ),
            ),
            if (showChevron)
              const Icon(
                Icons.chevron_right,
                color: Color(0xFF717171),
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();
  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, thickness: 1, color: AppColors.divider);
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final bool badge;
  final VoidCallback onTap;
  const _CircleIcon({
    required this.icon,
    this.badge = false,
    required this.onTap,
  });

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
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 22, color: AppColors.text),
            if (badge)
              Positioned(
                top: 11,
                right: 12,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
