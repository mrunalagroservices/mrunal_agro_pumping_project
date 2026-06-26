import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Small centered spinner shown by `CachedNetworkImage`'s `placeholder` while
/// a product photo is loading — without this, the widget renders nothing
/// during the fetch, which looks identical to a permanently missing image
/// (especially noticeable on the free-tier backend's cold-start delay).
Widget networkImagePlaceholder(BuildContext context, String url) {
  return const Center(
    child: SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
    ),
  );
}
