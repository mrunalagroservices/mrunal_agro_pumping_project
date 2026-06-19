import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
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
    });
  }

  void _goTo(int index) => setState(() => _selectedIndex = index);

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final unresolvedAlerts = state.alerts.where((a) => !a.isResolved).length;

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
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _goTo,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primary100,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.agriculture_outlined),
            selectedIcon: Icon(Icons.agriculture, color: AppColors.primary700),
            label: 'Farm',
          ),
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: AppColors.primary700),
            label: 'Market',
          ),
          const NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(Icons.shopping_bag, color: AppColors.primary700),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unresolvedAlerts > 0,
              label: Text('$unresolvedAlerts'),
              child: const Icon(Icons.chat_bubble_outline),
            ),
            selectedIcon: Badge(
              isLabelVisible: unresolvedAlerts > 0,
              label: Text('$unresolvedAlerts'),
              child: const Icon(Icons.chat_bubble, color: AppColors.primary700),
            ),
            label: 'Messages',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.primary700),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
