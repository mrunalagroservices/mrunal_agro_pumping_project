import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const fieldBorder = Color(0xFFB0B0B0);
}

String _maskPhone(String? phone) {
  if (phone == null || phone.isEmpty) return 'Not provided';
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 4) return phone;
  final last4 = digits.substring(digits.length - 4);
  return '+91 ***** $last4';
}

String _maskEmail(String email) {
  final at = email.indexOf('@');
  if (at <= 1) return email;
  final local = email.substring(0, at);
  final domain = email.substring(at);
  return '${local[0]}***${local[local.length - 1]}$domain';
}

class PersonalInfoScreen extends StatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  bool _editingName = false;
  bool _editingPhone = false;
  bool _editingEmail = false;
  bool _saving = false;
  String? _error;

  late TextEditingController _firstName;
  late TextEditingController _lastName;
  late TextEditingController _phone;
  late TextEditingController _email;

  @override
  void initState() {
    super.initState();
    final user = context.read<AppState>().user;
    final parts = (user?.name ?? '').trim().split(' ');
    _firstName = TextEditingController(text: parts.isNotEmpty ? parts.first : '');
    _lastName = TextEditingController(text: parts.length > 1 ? parts.sublist(1).join(' ') : '');
    _phone = TextEditingController(text: user?.phone ?? '');
    _email = TextEditingController(text: user?.email ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  void _comingSoon(String f) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$f — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _saveName() async {
    setState(() { _saving = true; _error = null; });
    final fullName = [_firstName.text.trim(), _lastName.text.trim()].where((s) => s.isNotEmpty).join(' ');
    final err = await context.read<AppState>().updateProfile(name: fullName);
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err == null) _editingName = false;
      else _error = err;
    });
  }

  Future<void> _savePhone() async {
    setState(() { _saving = true; _error = null; });
    final err = await context.read<AppState>().updateProfile(phone: _phone.text.trim());
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err == null) _editingPhone = false;
      else _error = err;
    });
  }

  Future<void> _saveEmail() async {
    setState(() { _saving = true; _error = null; });
    final err = await context.read<AppState>().updateProfile(email: _email.text.trim());
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err == null) _editingEmail = false;
      else _error = err;
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            _CircleBack(onTap: () => Navigator.pop(context)),
            const SizedBox(height: 18),
            const Text('Personal info',
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
            const SizedBox(height: 24),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)),
                  child: Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
                ),
              ),

            // ── Legal name ───────────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Text('Legal name', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                ),
                _LinkButton(
                  label: _editingName ? 'Cancel' : 'Edit',
                  onTap: () => setState(() {
                    if (_editingName) {
                      final parts = (user?.name ?? '').trim().split(' ');
                      _firstName.text = parts.isNotEmpty ? parts.first : '';
                      _lastName.text = parts.length > 1 ? parts.sublist(1).join(' ') : '';
                    }
                    _editingName = !_editingName;
                  }),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (!_editingName)
              Text(user?.name.isNotEmpty == true ? user!.name : 'Not provided',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext))
            else ...[
              const Text("Make sure this matches the name on your government ID.",
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3)),
              const SizedBox(height: 16),
              _OutlinedField(label: 'First name on ID', controller: _firstName),
              const SizedBox(height: 12),
              _OutlinedField(label: 'Last name on ID', controller: _lastName),
              const SizedBox(height: 16),
              _SaveButton(loading: _saving, onTap: _saveName),
            ],
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            // ── Preferred first name ─────────────────────────────────────
            _InfoRow(
              label: 'Preferred first name',
              value: 'Not provided',
              action: 'Add',
              onTap: () => _comingSoon('Preferred first name'),
            ),
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            // ── Phone ─────────────────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Text('Phone number', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                ),
                _LinkButton(
                  label: _editingPhone ? 'Cancel' : 'Edit',
                  onTap: () => setState(() {
                    if (_editingPhone) _phone.text = user?.phone ?? '';
                    _editingPhone = !_editingPhone;
                  }),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (!_editingPhone)
              Text(_maskPhone(user?.phone), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext))
            else ...[
              const SizedBox(height: 4),
              _OutlinedField(label: 'Phone number', controller: _phone, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              _SaveButton(loading: _saving, onTap: _savePhone),
            ],
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            // ── Email ─────────────────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Text('Email', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
                ),
                _LinkButton(
                  label: _editingEmail ? 'Cancel' : 'Edit',
                  onTap: () => setState(() {
                    if (_editingEmail) _email.text = user?.email ?? '';
                    _editingEmail = !_editingEmail;
                  }),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (!_editingEmail) ...[
              Text(user != null ? _maskEmail(user.email) : '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => _comingSoon('Email confirmation'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _P.text,
                  side: const BorderSide(color: Color(0xFFDDDDDD)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Confirm', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            ] else ...[
              _OutlinedField(label: 'Email', controller: _email, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _SaveButton(loading: _saving, onTap: _saveEmail),
            ],
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            // ── Static rows (not yet backed by data) ─────────────────────
            _InfoRow(label: 'Residential address', value: 'Not provided', action: 'Add', onTap: () => _comingSoon('Residential address')),
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            _InfoRow(label: 'Postal address', value: 'Not provided', action: 'Add', onTap: () => _comingSoon('Postal address')),
            const SizedBox(height: 24),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            const SizedBox(height: 24),

            _InfoRow(label: 'Emergency contact', value: 'Not provided', action: 'Add', onTap: () => _comingSoon('Emergency contact')),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final String action;
  final VoidCallback onTap;
  const _InfoRow({required this.label, required this.value, required this.action, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: _P.text)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext)),
            ],
          ),
        ),
        _LinkButton(label: action, onTap: onTap),
      ],
    );
  }
}

class _LinkButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _LinkButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: _P.text,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }
}

class _OutlinedField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  const _OutlinedField({required this.label, required this.controller, this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 14, color: _P.subtext),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _P.fieldBorder)),
        focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: _P.text, width: 1.5)),
      ),
    );
  }
}

class _SaveButton extends StatelessWidget {
  final bool loading;
  final VoidCallback onTap;
  const _SaveButton({required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 120,
      child: ElevatedButton(
        onPressed: loading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: _P.text,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: loading
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Text('Save', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
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
        child: const Icon(Icons.arrow_back, size: 22, color: _P.text),
      ),
    );
  }
}
