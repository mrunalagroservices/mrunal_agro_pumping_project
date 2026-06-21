import 'package:flutter/material.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const bubbleBg = Color(0xFFF2F2F2);
  static const accent = Color(0xFF16A34A);
}

class _FaqTopic {
  final String question;
  final String answer;
  const _FaqTopic(this.question, this.answer);
}

// Local, rule-based FAQ replies — no AI/network call. Keep answers in sync
// with actual app behaviour as features change.
const _faqTopics = [
  _FaqTopic('Where can I track my order?',
      "Open the Orders tab from the bottom bar to see every order's status — placed, confirmed, "
      "shipped, or delivered. Tap an order for full details and a live status timeline."),
  _FaqTopic('How do I cancel an order?',
      "You can cancel an order before it ships from the order's detail screen. Once it's shipped, "
      "please contact us by email so we can help with a return."),
  _FaqTopic('My pump shows offline — what do I do?',
      "Check that the device has power and a working internet/WiFi connection at the farm. The "
      "Farms & Devices screen shows the last time each device reported in. If it's been offline for "
      "more than a few minutes, check the ESP32 controller's power and signal at the pump site."),
  _FaqTopic('How is electricity cost calculated?',
      "We estimate electricity usage from your pump's motor power rating and how long it ran, using "
      "the per-kWh rate set on the Settings page. Add or update pump specs from Farms & Devices to "
      "get accurate readings."),
  _FaqTopic('What payment methods are accepted?',
      "Cash on Delivery is available on all orders (a small handling fee applies). Card and UPI "
      "options appear at checkout when available for your order."),
  _FaqTopic('How do I delete my account?',
      "Go to Profile → Account settings → Privacy → Delete my account. We'll schedule deletion with "
      "a grace period during which you can still cancel it."),
];

class _ChatMessage {
  final String text;
  final bool fromUser;
  const _ChatMessage(this.text, this.fromUser);
}

class FaqChatScreen extends StatefulWidget {
  const FaqChatScreen({super.key});

  @override
  State<FaqChatScreen> createState() => _FaqChatScreenState();
}

class _FaqChatScreenState extends State<FaqChatScreen> {
  final List<_ChatMessage> _messages = [
    const _ChatMessage(
      "Hi! I'm the Mrunal Agro help bot. Pick a question below, or email "
      "support@mrunalagro.in if you need a person.",
      false,
    ),
  ];
  final _scroll = ScrollController();
  final Set<int> _askedTopics = {};

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _ask(int i) {
    final topic = _faqTopics[i];
    setState(() {
      _messages.add(_ChatMessage(topic.question, true));
      _messages.add(_ChatMessage(topic.answer, false));
      _askedTopics.add(i);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  @override
  Widget build(BuildContext context) {
    final remaining = List.generate(_faqTopics.length, (i) => i).where((i) => !_askedTopics.contains(i)).toList();

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
                    child: Text('Help bot',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                itemCount: _messages.length,
                itemBuilder: (context, i) => _Bubble(message: _messages[i]),
              ),
            ),
            if (remaining.isNotEmpty)
              Container(
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: _P.divider)),
                ),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: remaining
                      .map((i) => InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => _ask(i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: _P.accent),
                              ),
                              child: Text(_faqTopics[i].question,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.accent)),
                            ),
                          ))
                      .toList(),
                ),
              )
            else
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Text("That's everything I can help with — email support@mrunalagro.in for anything else.",
                    style: TextStyle(fontSize: 12, color: _P.subtext)),
              ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final _ChatMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final align = message.fromUser ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final bg = message.fromUser ? _P.accent : _P.bubbleBg;
    final fg = message.fromUser ? Colors.white : _P.text;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: align,
        children: [
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
            child: Text(message.text,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: fg, height: 1.4)),
          ),
        ],
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
