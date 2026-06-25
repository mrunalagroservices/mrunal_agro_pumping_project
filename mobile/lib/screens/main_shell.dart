import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import 'alerts_screen.dart';
import 'dashboard_screen.dart';
import 'map_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadDashboard();
      context.read<AppState>().loadNotifications();
    });
  }

  void _goTo(int index) {
    ScaffoldMessenger.of(context).clearSnackBars();
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final unresolvedAlerts = state.notifications.where((n) => n.isUnresolvedAlert).length;

    // Mandi-only accounts (no farm/device registered) skip the Dashboard tab
    // entirely — Map/Schedules/Analytics are only reachable from there, so
    // hiding it hides all farm features at once. Market becomes the home tab.
    final hasFarmAccess = state.hasFarmAccess;
    int ordersIndex = 0;
    int alertsIndex = 0;

    final items = <_NavItem>[];
    final screens = <Widget>[];

    if (hasFarmAccess) {
      items.add(_NavItem(Icons.agriculture_outlined, Icons.agriculture, context.tr('nav_farm')));
      screens.add(DashboardScreen(
        onViewMap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MapScreen()),
        ),
      ));
    }
    items.add(_NavItem(Icons.storefront_outlined, Icons.storefront, context.tr('nav_market')));
    screens.add(const ShopScreen());
    ordersIndex = screens.length;
    items.add(_NavItem(Icons.shopping_bag_outlined, Icons.shopping_bag, context.tr('nav_orders')));
    screens.add(const OrdersScreen());
    alertsIndex = screens.length;
    items.add(_NavItem(Icons.notifications_outlined, Icons.notifications, context.tr('nav_notifications'), badge: unresolvedAlerts));
    screens.add(AlertsScreen(title: context.tr('nav_notifications')));
    items.add(_NavItem(Icons.person_outline, Icons.person, context.tr('nav_profile')));
    screens.add(ProfileScreen(
      onViewOrders: () => _goTo(ordersIndex),
      onViewMessages: () => _goTo(alertsIndex),
    ));

    final selectedIndex = _selectedIndex.clamp(0, screens.length - 1);

    return Scaffold(
      body: IndexedStack(
        index: selectedIndex,
        children: screens,
      ),
      bottomNavigationBar: _BottomBar(
        items: items,
        selectedIndex: selectedIndex,
        onSelect: _goTo,
      ),
    );
  }
}

/// Clean bottom nav: outline icons + label, no pill indicator, selected
/// tab tinted. Matches the flat reference style.
class _BottomBar extends StatelessWidget {
  final List<_NavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  const _BottomBar({
    required this.items,
    required this.selectedIndex,
    required this.onSelect,
  });

  static const _selected = AppColors.accent;
  static const _unselected = AppColors.subtext;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.divider, width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: List.generate(items.length, (i) {
              final item = items[i];
              final active = i == selectedIndex;
              final color = active ? _selected : _unselected;
              return Expanded(
                child: InkWell(
                  onTap: () => onSelect(i),
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _IconWithBadge(
                        icon: active ? item.activeIcon : item.icon,
                        color: color,
                        badge: item.badge,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: active ? FontWeight.w500 : FontWeight.w400,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int badge;
  _NavItem(this.icon, this.activeIcon, this.label, {this.badge = 0});
}

class _IconWithBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int badge;
  const _IconWithBadge({required this.icon, required this.color, this.badge = 0});

  @override
  Widget build(BuildContext context) {
    final iconWidget = Icon(icon, size: 24, color: color);
    if (badge <= 0) return iconWidget;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        iconWidget,
        Positioned(
          top: -5,
          right: -7,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: AppColors.accent,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white, width: 1.5),
            ),
            constraints: const BoxConstraints(minWidth: 18),
            child: Text(
              '$badge',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }
}
