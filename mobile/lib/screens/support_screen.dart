import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/app_state.dart';
import 'faq_chat_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadSupportInfo();
    });
  }

  Future<void> _launch(Uri uri, String failureMessage) async {
    final ok = await launchUrl(uri);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failureMessage)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final contact = state.supportContact;

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
                    child: Text('Find support',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                children: [
                  const Text('How can we help?',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _P.text)),
                  const SizedBox(height: 6),
                  const Text(
                    "Reach our team directly, or get instant answers from the help bot for common questions.",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.4),
                  ),
                  const SizedBox(height: 24),
                  _ContactRow(
                    icon: Icons.chat_bubble_outline,
                    title: 'Chat with our help bot',
                    subtitle: 'Instant answers for orders, devices, and payments',
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FaqChatScreen())),
                  ),
                  if (state.isLoadingSupport && contact == null) ...[
                    const SizedBox(height: 24),
                    const Center(child: CircularProgressIndicator()),
                  ] else if (contact != null) ...[
                    if (contact.email != null) ...[
                      const SizedBox(height: 12),
                      _ContactRow(
                        icon: Icons.mail_outline,
                        title: 'Email us',
                        subtitle: contact.email!,
                        onTap: () => _launch(
                          Uri(scheme: 'mailto', path: contact.email, query: 'subject=Support request'),
                          'Could not open an email app.',
                        ),
                      ),
                    ],
                    if (contact.phone != null) ...[
                      const SizedBox(height: 12),
                      _ContactRow(
                        icon: Icons.call_outlined,
                        title: 'Call us',
                        subtitle: contact.hours != null ? '${contact.phone} · ${contact.hours}' : contact.phone!,
                        onTap: () => _launch(
                          Uri(scheme: 'tel', path: contact.phone),
                          'Could not open the dialer.',
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _ContactRow({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _P.divider),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: _P.circleBtn, borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: Icon(icon, size: 20, color: _P.text),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: _P.subtext),
          ],
        ),
      ),
    );
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
