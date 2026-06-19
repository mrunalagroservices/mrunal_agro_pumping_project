import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user.dart';
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
  bool _editingPreferred = false;
  bool _editingPhone = false;
  bool _editingEmail = false;
  bool _editingResidential = false;
  bool _editingPostal = false;
  bool _editingEmergency = false;
  bool _saving = false;
  String? _error;

  late TextEditingController _firstName;
  late TextEditingController _lastName;
  late TextEditingController _preferred;
  late TextEditingController _phone;
  late TextEditingController _email;

  late TextEditingController _resLine1, _resLine2, _resCity, _resState, _resPincode;
  late TextEditingController _postLine1, _postLine2, _postCity, _postState, _postPincode;
  late TextEditingController _emName, _emPhone, _emRelationship;

  @override
  void initState() {
    super.initState();
    final user = context.read<AppState>().user;
    final parts = (user?.name ?? '').trim().split(' ');
    _firstName = TextEditingController(text: parts.isNotEmpty ? parts.first : '');
    _lastName = TextEditingController(text: parts.length > 1 ? parts.sublist(1).join(' ') : '');
    _preferred = TextEditingController(text: user?.preferredFirstName ?? '');
    _phone = TextEditingController(text: user?.phone ?? '');
    _email = TextEditingController(text: user?.email ?? '');

    final res = user?.residentialAddress;
    _resLine1 = TextEditingController(text: res?.line1 ?? '');
    _resLine2 = TextEditingController(text: res?.line2 ?? '');
    _resCity = TextEditingController(text: res?.city ?? '');
    _resState = TextEditingController(text: res?.state ?? '');
    _resPincode = TextEditingController(text: res?.pincode ?? '');

    final post = user?.postalAddress;
    _postLine1 = TextEditingController(text: post?.line1 ?? '');
    _postLine2 = TextEditingController(text: post?.line2 ?? '');
    _postCity = TextEditingController(text: post?.city ?? '');
    _postState = TextEditingController(text: post?.state ?? '');
    _postPincode = TextEditingController(text: post?.pincode ?? '');

    final emergency = user?.emergencyContact;
    _emName = TextEditingController(text: emergency?.name ?? '');
    _emPhone = TextEditingController(text: emergency?.phone ?? '');
    _emRelationship = TextEditingController(text: emergency?.relationship ?? '');
  }

  @override
  void dispose() {
    for (final c in [
      _firstName, _lastName, _preferred, _phone, _email,
      _resLine1, _resLine2, _resCity, _resState, _resPincode,
      _postLine1, _postLine2, _postCity, _postState, _postPincode,
      _emName, _emPhone, _emRelationship,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _comingSoon(String f) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$f — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  Future<bool> _commit(Future<String?> Function() action) async {
    setState(() { _saving = true; _error = null; });
    final err = await action();
    if (!mounted) return false;
    setState(() {
      _saving = false;
      if (err != null) _error = err;
    });
    return err == null;
  }

  Future<void> _saveName() async {
    final fullName = [_firstName.text.trim(), _lastName.text.trim()].where((s) => s.isNotEmpty).join(' ');
    final ok = await _commit(() => context.read<AppState>().updateProfile(name: fullName));
    if (ok) setState(() => _editingName = false);
  }

  Future<void> _savePreferred() async {
    final ok = await _commit(() => context.read<AppState>().updateProfile(preferredFirstName: _preferred.text.trim()));
    if (ok) setState(() => _editingPreferred = false);
  }

  Future<void> _savePhone() async {
    final ok = await _commit(() => context.read<AppState>().updateProfile(phone: _phone.text.trim()));
    if (ok) setState(() => _editingPhone = false);
  }

  Future<void> _saveEmail() async {
    final ok = await _commit(() => context.read<AppState>().updateProfile(email: _email.text.trim()));
    if (ok) setState(() => _editingEmail = false);
  }

  Future<void> _saveResidential() async {
    final addr = PostalLikeAddress(
      line1: _resLine1.text.trim(), line2: _resLine2.text.trim(),
      city: _resCity.text.trim(), state: _resState.text.trim(), pincode: _resPincode.text.trim(),
    );
    final ok = await _commit(() => context.read<AppState>().updateProfile(residentialAddress: addr));
    if (ok) setState(() => _editingResidential = false);
  }

  Future<void> _savePostal() async {
    final addr = PostalLikeAddress(
      line1: _postLine1.text.trim(), line2: _postLine2.text.trim(),
      city: _postCity.text.trim(), state: _postState.text.trim(), pincode: _postPincode.text.trim(),
    );
    final ok = await _commit(() => context.read<AppState>().updateProfile(postalAddress: addr));
    if (ok) setState(() => _editingPostal = false);
  }

  Future<void> _saveEmergency() async {
    final contact = EmergencyContact(
      name: _emName.text.trim(), phone: _emPhone.text.trim(), relationship: _emRelationship.text.trim(),
    );
    final ok = await _commit(() => context.read<AppState>().updateProfile(emergencyContact: contact));
    if (ok) setState(() => _editingEmergency = false);
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
            _EditableSection(
              label: 'Legal name',
              editing: _editingName,
              onToggle: () => setState(() {
                if (_editingName) {
                  final parts = (user?.name ?? '').trim().split(' ');
                  _firstName.text = parts.isNotEmpty ? parts.first : '';
                  _lastName.text = parts.length > 1 ? parts.sublist(1).join(' ') : '';
                }
                _editingName = !_editingName;
              }),
              collapsed: Text(user?.name.isNotEmpty == true ? user!.name : 'Not provided',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext)),
              expanded: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Make sure this matches the name on your government ID.",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3)),
                  const SizedBox(height: 16),
                  _OutlinedField(label: 'First name on ID', controller: _firstName),
                  const SizedBox(height: 12),
                  _OutlinedField(label: 'Last name on ID', controller: _lastName),
                  const SizedBox(height: 16),
                  _SaveButton(loading: _saving, onTap: _saveName),
                ],
              ),
            ),
            const _SectionDivider(),

            // ── Preferred first name ─────────────────────────────────────
            _EditableSection(
              label: 'Preferred first name',
              editing: _editingPreferred,
              onToggle: () => setState(() {
                if (_editingPreferred) _preferred.text = user?.preferredFirstName ?? '';
                _editingPreferred = !_editingPreferred;
              }),
              actionLabelWhenCollapsed: (user?.preferredFirstName?.isNotEmpty ?? false) ? 'Edit' : 'Add',
              collapsed: Text(
                (user?.preferredFirstName?.isNotEmpty ?? false) ? user!.preferredFirstName! : 'Not provided',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext),
              ),
              expanded: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _OutlinedField(label: 'Preferred first name', controller: _preferred),
                  const SizedBox(height: 16),
                  _SaveButton(loading: _saving, onTap: _savePreferred),
                ],
              ),
            ),
            const _SectionDivider(),

            // ── Phone ─────────────────────────────────────────────────────
            _EditableSection(
              label: 'Phone number',
              editing: _editingPhone,
              onToggle: () => setState(() {
                if (_editingPhone) _phone.text = user?.phone ?? '';
                _editingPhone = !_editingPhone;
              }),
              collapsed: Text(_maskPhone(user?.phone), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext)),
              expanded: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _OutlinedField(label: 'Phone number', controller: _phone, keyboardType: TextInputType.phone),
                  const SizedBox(height: 16),
                  _SaveButton(loading: _saving, onTap: _savePhone),
                ],
              ),
            ),
            const _SectionDivider(),

            // ── Email ─────────────────────────────────────────────────────
            _EditableSection(
              label: 'Email',
              editing: _editingEmail,
              onToggle: () => setState(() {
                if (_editingEmail) _email.text = user?.email ?? '';
                _editingEmail = !_editingEmail;
              }),
              collapsed: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                ],
              ),
              expanded: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _OutlinedField(label: 'Email', controller: _email, keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 16),
                  _SaveButton(loading: _saving, onTap: _saveEmail),
                ],
              ),
            ),
            const _SectionDivider(),

            // ── Residential address ──────────────────────────────────────
            _EditableSection(
              label: 'Residential address',
              editing: _editingResidential,
              onToggle: () => setState(() {
                if (_editingResidential) {
                  final r = user?.residentialAddress;
                  _resLine1.text = r?.line1 ?? '';
                  _resLine2.text = r?.line2 ?? '';
                  _resCity.text = r?.city ?? '';
                  _resState.text = r?.state ?? '';
                  _resPincode.text = r?.pincode ?? '';
                }
                _editingResidential = !_editingResidential;
              }),
              actionLabelWhenCollapsed: (user?.residentialAddress?.isEmpty ?? true) ? 'Add' : 'Edit',
              collapsed: Text(
                (user?.residentialAddress?.isEmpty ?? true) ? 'Not provided' : user!.residentialAddress!.oneLine,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3),
              ),
              expanded: _AddressFields(
                line1: _resLine1, line2: _resLine2, city: _resCity, state: _resState, pincode: _resPincode,
                saving: _saving, onSave: _saveResidential,
              ),
            ),
            const _SectionDivider(),

            // ── Postal address ────────────────────────────────────────────
            _EditableSection(
              label: 'Postal address',
              editing: _editingPostal,
              onToggle: () => setState(() {
                if (_editingPostal) {
                  final p = user?.postalAddress;
                  _postLine1.text = p?.line1 ?? '';
                  _postLine2.text = p?.line2 ?? '';
                  _postCity.text = p?.city ?? '';
                  _postState.text = p?.state ?? '';
                  _postPincode.text = p?.pincode ?? '';
                }
                _editingPostal = !_editingPostal;
              }),
              actionLabelWhenCollapsed: (user?.postalAddress?.isEmpty ?? true) ? 'Add' : 'Edit',
              collapsed: Text(
                (user?.postalAddress?.isEmpty ?? true) ? 'Not provided' : user!.postalAddress!.oneLine,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3),
              ),
              expanded: _AddressFields(
                line1: _postLine1, line2: _postLine2, city: _postCity, state: _postState, pincode: _postPincode,
                saving: _saving, onSave: _savePostal,
              ),
            ),
            const _SectionDivider(),

            // ── Emergency contact ─────────────────────────────────────────
            _EditableSection(
              label: 'Emergency contact',
              editing: _editingEmergency,
              onToggle: () => setState(() {
                if (_editingEmergency) {
                  final e = user?.emergencyContact;
                  _emName.text = e?.name ?? '';
                  _emPhone.text = e?.phone ?? '';
                  _emRelationship.text = e?.relationship ?? '';
                }
                _editingEmergency = !_editingEmergency;
              }),
              actionLabelWhenCollapsed: (user?.emergencyContact?.isEmpty ?? true) ? 'Add' : 'Edit',
              collapsed: Text(
                (user?.emergencyContact?.isEmpty ?? true)
                    ? 'Not provided'
                    : '${user!.emergencyContact!.name} · ${user.emergencyContact!.phone}'
                        '${(user.emergencyContact!.relationship?.isNotEmpty ?? false) ? ' (${user.emergencyContact!.relationship})' : ''}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3),
              ),
              expanded: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _OutlinedField(label: 'Contact name', controller: _emName),
                  const SizedBox(height: 12),
                  _OutlinedField(label: 'Phone number', controller: _emPhone, keyboardType: TextInputType.phone),
                  const SizedBox(height: 12),
                  _OutlinedField(label: 'Relationship', controller: _emRelationship),
                  const SizedBox(height: 16),
                  _SaveButton(loading: _saving, onTap: _saveEmergency),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A label row with an Edit/Cancel (or Add/Cancel) link, showing either
/// the collapsed display value or the expanded edit form.
class _EditableSection extends StatelessWidget {
  final String label;
  final bool editing;
  final VoidCallback onToggle;
  final Widget collapsed;
  final Widget expanded;
  final String? actionLabelWhenCollapsed;

  const _EditableSection({
    required this.label,
    required this.editing,
    required this.onToggle,
    required this.collapsed,
    required this.expanded,
    this.actionLabelWhenCollapsed,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w400, color: _P.text)),
            ),
            _LinkButton(
              label: editing ? 'Cancel' : (actionLabelWhenCollapsed ?? 'Edit'),
              onTap: onToggle,
            ),
          ],
        ),
        const SizedBox(height: 4),
        if (!editing) collapsed else Padding(padding: const EdgeInsets.only(top: 12), child: expanded),
      ],
    );
  }
}

class _SectionDivider extends StatelessWidget {
  const _SectionDivider();
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 24),
      child: Divider(height: 1, thickness: 1, color: _P.divider),
    );
  }
}

class _AddressFields extends StatelessWidget {
  final TextEditingController line1, line2, city, state, pincode;
  final bool saving;
  final VoidCallback onSave;

  const _AddressFields({
    required this.line1, required this.line2, required this.city,
    required this.state, required this.pincode, required this.saving, required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _OutlinedField(label: 'Address line 1', controller: line1),
        const SizedBox(height: 12),
        _OutlinedField(label: 'Address line 2 (optional)', controller: line2),
        const SizedBox(height: 12),
        _OutlinedField(label: 'City', controller: city),
        const SizedBox(height: 12),
        _OutlinedField(label: 'State', controller: state),
        const SizedBox(height: 12),
        _OutlinedField(label: 'Pincode', controller: pincode, keyboardType: TextInputType.number),
        const SizedBox(height: 16),
        _SaveButton(loading: saving, onTap: onSave),
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
          fontWeight: FontWeight.w400,
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
