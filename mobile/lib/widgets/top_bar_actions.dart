import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../screens/points_screen.dart';
import '../screens/profile_screen.dart';

/// Points + profile icon buttons shown in the top-right corner of every tab,
/// matching the reference app's home screen header.
class TopBarActions extends StatelessWidget {
  const TopBarActions({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _CircleIconButton(
          icon: Icons.workspace_premium_outlined,
          tooltip: 'Points',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PointsScreen()),
          ),
        ),
        const SizedBox(width: 8),
        _CircleIconButton(
          icon: Icons.person_outline,
          tooltip: 'My profile',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ProfileScreen()),
          ),
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _CircleIconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Icon(icon, size: 20, color: Colors.black87),
        ),
      ),
    );
  }
}
