import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../l10n/tr_extension.dart';
import '../models/order.dart';
import '../config/theme.dart';

class _Step {
  final IconData icon;
  final String labelKey;
  const _Step(this.icon, this.labelKey);
}

const _steps = [
  _Step(Icons.inventory_2_outlined, 'order_timeline_placed'),
  _Step(Icons.check_circle_outline, 'order_timeline_confirmed'),
  _Step(Icons.local_shipping_outlined, 'order_timeline_dispatched'),
  _Step(Icons.two_wheeler, 'order_timeline_out_for_delivery'),
  _Step(Icons.thumb_up_alt, 'order_timeline_delivered'),
];

/// Vertical step tracker for an order's journey from being placed through to
/// delivery. Steps up to and including the order's current status are shown
/// as done/active; later ones are greyed out. A separate, simpler banner is
/// shown instead when the order was cancelled, since it isn't part of this
/// linear journey.
class OrderTimeline extends StatelessWidget {
  final OrderModel order;
  const OrderTimeline({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    if (order.isCancelled) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: order.statusBg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(Icons.cancel_outlined, color: order.statusColor, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                context.tr('orders_status_cancelled_sub'),
                style: TextStyle(color: order.statusColor, fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
      );
    }

    final currentIndex = order.statusStepIndex;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('order_timeline_title'),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.text),
          ),
          const SizedBox(height: 16),
          for (int i = 0; i < _steps.length; i++)
            _StepRow(
              step: _steps[i],
              done: currentIndex >= 0 && i <= currentIndex,
              isLast: i == _steps.length - 1,
            ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  final _Step step;
  final bool done;
  final bool isLast;
  const _StepRow({required this.step, required this.done, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final color = done ? AppColors.success : AppColors.subtext;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: done ? AppColors.success : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 1.5),
                ),
                alignment: Alignment.center,
                child: Icon(
                  done ? Icons.check : step.icon,
                  size: 15,
                  color: done ? Colors.white : AppColors.subtext,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: done ? AppColors.success : AppColors.divider,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 16),
            child: Text(
              context.tr(step.labelKey),
              style: TextStyle(
                fontSize: 13,
                fontWeight: done ? FontWeight.w500 : FontWeight.w400,
                color: done ? AppColors.text : AppColors.subtext,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Delivery rider/courier contact card — only rendered once the backend has
/// assigned a contact (typically once the order ships), with a one-tap call
/// button.
class DeliveryContactCard extends StatelessWidget {
  final String name;
  final String phone;
  const DeliveryContactCard({super.key, required this.name, required this.phone});

  Future<void> _call(BuildContext context) async {
    final ok = await launchUrl(Uri(scheme: 'tel', path: phone));
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('order_timeline_call_failed'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.person_outline, color: AppColors.success, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('order_timeline_delivery_contact'),
                  style: const TextStyle(fontSize: 11, color: AppColors.subtext),
                ),
                const SizedBox(height: 2),
                Text(
                  name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.text),
                ),
              ],
            ),
          ),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => _call(context),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
              child: const Icon(Icons.call, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
