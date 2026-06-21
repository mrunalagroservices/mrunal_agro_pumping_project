import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/legal_document.dart';
import '../providers/app_state.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class LegalScreen extends StatefulWidget {
  const LegalScreen({super.key});

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadLegalDocuments();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final docs = state.legalDocuments;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  const Expanded(
                    child: Text('Legal',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: state.isLoadingLegal && docs.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : docs.isEmpty
                      ? const Center(child: Text('Could not load legal documents.', style: TextStyle(color: _P.subtext)))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                          itemCount: docs.length,
                          separatorBuilder: (_, _) => const Divider(height: 1, thickness: 1, color: _P.divider),
                          itemBuilder: (context, i) {
                            final doc = docs[i];
                            return InkWell(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => LegalDocScreen(slug: doc.slug, title: doc.title)),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(doc.title,
                                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                                    ),
                                    const Icon(Icons.chevron_right, color: _P.subtext),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class LegalDocScreen extends StatefulWidget {
  final String slug;
  final String title;
  const LegalDocScreen({super.key, required this.slug, required this.title});

  @override
  State<LegalDocScreen> createState() => _LegalDocScreenState();
}

class _LegalDocScreenState extends State<LegalDocScreen> {
  LegalDocument? _doc;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final doc = await context.read<AppState>().fetchLegalDocument(widget.slug);
    if (!mounted) return;
    setState(() {
      _doc = doc;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  Expanded(
                    child: Text(widget.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _doc == null
                      ? const Center(child: Text('Could not load this document.', style: TextStyle(color: _P.subtext)))
                      : ListView(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
                          children: [
                            if (_doc!.updatedAt.isNotEmpty)
                              Text(_formatUpdated(_doc!.updatedAt), style: const TextStyle(fontSize: 11, color: _P.subtext)),
                            const SizedBox(height: 16),
                            for (final section in _doc!.sections) ...[
                              Text(section.heading,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                              const SizedBox(height: 6),
                              Text(section.body,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.45)),
                              const SizedBox(height: 18),
                            ],
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatUpdated(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return 'Last updated ${d.day} ${months[d.month - 1]} ${d.year}';
  }
}

class _CircleBack extends StatelessWidget {
  final VoidCallback onTap;
  const _CircleBack({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: const Icon(Icons.arrow_back, size: 20, color: _P.text),
      ),
    );
  }
}
