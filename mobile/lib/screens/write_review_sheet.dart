import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
}

/// Bottom sheet for rating + reviewing a product. Returns `true` via
/// Navigator.pop on successful submission so callers can refresh.
Future<bool?> showWriteReviewSheet(BuildContext context, {required int productId, required String productName, int initialRating = 5}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => WriteReviewSheet(productId: productId, productName: productName, initialRating: initialRating),
  );
}

class WriteReviewSheet extends StatefulWidget {
  final int productId;
  final String productName;
  final int initialRating;

  const WriteReviewSheet({super.key, required this.productId, required this.productName, this.initialRating = 5});

  @override
  State<WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<WriteReviewSheet> {
  late int _rating = widget.initialRating;
  final _comment = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _saving = true; _error = null; });
    final err = await context.read<AppState>().submitReview(widget.productId, _rating, _comment.text.trim());
    if (!mounted) return;
    if (err == null) {
      Navigator.pop(context, true);
    } else {
      setState(() { _saving = false; _error = err; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(widget.productName, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
              ),
              InkWell(onTap: () => Navigator.pop(context), child: const Icon(Icons.close, color: _P.text)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: List.generate(5, (i) {
              final star = i + 1;
              return InkWell(
                onTap: () => setState(() => _rating = star),
                child: Icon(star <= _rating ? Icons.star_rounded : Icons.star_border_rounded, size: 36, color: const Color(0xFF15803D)),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _comment,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Share your experience with this product (optional)',
              hintStyle: const TextStyle(color: _P.subtext),
              contentPadding: const EdgeInsets.all(14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFB0B0B0))),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: _P.text,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}
