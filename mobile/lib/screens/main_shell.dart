import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
    final state = context.watch<AppState>();
    final unresolvedAlerts = state.notifications.where((n) => n.isUnresolvedAlert).length;

    final screens = [
      DashboardScreen(
        onViewMap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MapScreen()),
        ),
      ),
      const ShopScreen(),
      const OrdersScreen(),
      const AlertsScreen(title: 'Messages'),
      ProfileScreen(
        onViewOrders: () => _goTo(2),
        onViewMessages: () => _goTo(3),
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: screens,
      ),
      bottomNavigationBar: _BottomBar(
        selectedIndex: _selectedIndex,
        onSelect: _goTo,
        messagesBadge: unresolvedAlerts,
      ),
    );
  }
}

/// Clean bottom nav: outline icons + label, no pill indicator, selected
/// tab tinted. Matches the flat reference style.
class _BottomBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final int messagesBadge;

  const _BottomBar({
    required this.selectedIndex,
    required this.onSelect,
    required this.messagesBadge,
  });

  static const _selected = Color(0xFFFF385C);
  static const _unselected = Color(0xFF717171);

  @override
  Widget build(BuildContext context) {
    final items = <_NavItem>[
      _NavItem(Icons.agriculture_outlined, Icons.agriculture, 'Farm'),
      _NavItem(Icons.storefront_outlined, Icons.storefront, 'Market'),
      _NavItem(Icons.shopping_bag_outlined, Icons.shopping_bag, 'Orders'),
      _NavItem(Icons.chat_bubble_outline, Icons.chat_bubble, 'Messages', badge: messagesBadge),
      _NavItem(Icons.person_outline, Icons.person, 'Profile'),
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEBEBEB), width: 1)),
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
              color: const Color(0xFFFF385C),
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
