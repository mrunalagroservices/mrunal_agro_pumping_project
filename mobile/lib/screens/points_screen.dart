import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../widgets/language_switcher.dart';

class PointsScreen extends StatelessWidget {
  const PointsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('points_title')), actions: const [LanguageSwitcher(size: 36), SizedBox(width: 8)]),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primary100,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.workspace_premium_outlined,
                    color: AppColors.primary700, size: 36),
              ),
              const SizedBox(height: 16),
              Text(
                context.tr('points_coming_soon'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr('points_coming_soon_sub'),
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
