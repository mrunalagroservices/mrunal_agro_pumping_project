import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/faq_topic.dart';
import '../providers/app_state.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const bubbleBg = Color(0xFFF2F2F2);
  static const accent = Color(0xFF16A34A);
}

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
  final List<_ChatMessage> _messages = [];
  final _scroll = ScrollController();
  final Set<int> _askedTopics = {};
  bool _greeted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AppState>().loadSupportInfo());
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _greet(String? email) {
    if (_greeted) return;
    _greeted = true;
    _messages.add(_ChatMessage(
      "Hi! I'm the Mrunal Agro help bot. Pick a question below"
      "${email != null ? ', or email $email if you need a person.' : '.'}",
      false,
    ));
  }

  void _ask(List<FaqTopic> topics, int i) {
    final topic = topics[i];
    setState(() {
      _messages.add(_ChatMessage(topic.question, true));
      _messages.add(_ChatMessage(topic.answer, false));
      _askedTopics.add(topic.id);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final topics = state.faqTopics;
    _greet(state.supportContact?.email);
    final remaining = List.generate(topics.length, (i) => i).where((i) => !_askedTopics.contains(topics[i].id)).toList();

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
              child: state.isLoadingSupport && topics.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
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
                            onTap: () => _ask(topics, i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: _P.accent),
                              ),
                              child: Text(topics[i].question,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _P.accent)),
                            ),
                          ))
                      .toList(),
                ),
              )
            else if (topics.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Text(
                  "That's everything I can help with"
                  "${state.supportContact?.email != null ? ' — email ${state.supportContact!.email} for anything else.' : '.'}",
                  style: const TextStyle(fontSize: 12, color: _P.subtext),
                ),
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
