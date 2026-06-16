import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import 'alerts_screen.dart';
import 'dashboard_screen.dart';
import 'farms_screen.dart';
import 'map_screen.dart';
import 'schedules_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  static const _mapTabIndex = 4;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadDashboard();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final unresolvedAlerts = state.alerts.where((a) => !a.isResolved).length;

    final screens = [
      DashboardScreen(onViewMap: () => setState(() => _selectedIndex = _mapTabIndex)),
      const FarmsScreen(),
      const AlertsScreen(),
      const SchedulesScreen(),
      const MapScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primary100,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard, color: AppColors.primary700),
            label: 'Dashboard',
          ),
          const NavigationDestination(
            icon: Icon(Icons.agriculture_outlined),
            selectedIcon: Icon(Icons.agriculture, color: AppColors.primary700),
            label: 'Farms',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unresolvedAlerts > 0,
              label: Text('$unresolvedAlerts'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: unresolvedAlerts > 0,
              label: Text('$unresolvedAlerts'),
              child: const Icon(Icons.notifications, color: AppColors.primary700),
            ),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.schedule_outlined),
            selectedIcon: Icon(Icons.schedule, color: AppColors.primary700),
            label: 'Schedules',
          ),
          const NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map, color: AppColors.primary700),
            label: 'Map',
          ),
        ],
      ),
    );
  }
}
