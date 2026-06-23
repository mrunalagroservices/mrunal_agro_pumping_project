import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../models/schedule.dart';
import '../providers/app_state.dart';
import '../services/feedback_service.dart';
import '../widgets/language_switcher.dart';

class SchedulesScreen extends StatefulWidget {
  const SchedulesScreen({super.key});

  @override
  State<SchedulesScreen> createState() => _SchedulesScreenState();
}

class _SchedulesScreenState extends State<SchedulesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = context.read<AppState>();
      state.loadSchedules();
      if (state.actuators.isEmpty) state.loadDashboard();
    });
  }

  void _showAddSchedule() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddScheduleSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('schedules_title'), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        actions: [
          const LanguageSwitcher(size: 36),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: context.tr('schedules_add_tooltip'),
            onPressed: state.actuators.isEmpty ? null : _showAddSchedule,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadSchedules(),
        child: state.isLoadingSchedules
            ? const Center(child: CircularProgressIndicator())
            : state.schedulesError != null
                ? ListView(children: [
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(state.schedulesError!,
                            style: const TextStyle(color: Color(0xFFDC2626))),
                      ),
                    )
                  ])
                : state.schedules.isEmpty
                    ? ListView(children: [
                        Padding(
                          padding: const EdgeInsets.all(48),
                          child: Column(
                            children: [
                              Icon(Icons.schedule_outlined, size: 48, color: AppColors.subtext),
                              const SizedBox(height: 12),
                              Text(context.tr('schedules_empty_title'),
                                  style: const TextStyle(color: AppColors.subtext, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              Text(
                                context.tr('schedules_empty_sub'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.subtext, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: state.schedules.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) => _ScheduleCard(schedule: state.schedules[i]),
                      ),
      ),
      floatingActionButton: state.actuators.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _showAddSchedule,
              icon: const Icon(Icons.add),
              label: Text(context.tr('schedules_add_tooltip')),
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
            )
          : null,
    );
  }
}

class _ScheduleCard extends StatefulWidget {
  final Schedule schedule;
  const _ScheduleCard({required this.schedule});

  @override
  State<_ScheduleCard> createState() => _ScheduleCardState();
}

class _ScheduleCardState extends State<_ScheduleCard> {
  bool _toggling = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.schedule;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: s.isActive
                    ? AppColors.success.withValues(alpha: 0.1)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.schedule,
                color: s.isActive ? AppColors.success : AppColors.subtext,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12)),
                  const SizedBox(height: 2),
                  Text(
                    '${s.actuatorName ?? context.tr('common_unknown')} · ${s.displayTime} · ${s.durationMinutes}min',
                    style: TextStyle(fontSize: 10, color: AppColors.subtext),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    s.activeDays,
                    style: TextStyle(fontSize: 9, color: AppColors.subtext),
                  ),
                ],
              ),
            ),
            Column(
              children: [
                _toggling
                    ? const SizedBox(width: 36, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Switch(
                        value: s.isActive,
                        activeTrackColor: AppColors.success,
                        activeThumbColor: Colors.white,
                        inactiveTrackColor: const Color(0xFFE2E8F0),
                        inactiveThumbColor: Colors.white,
                        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
                        onChanged: (_) async {
                          FeedbackService.lightTap();
                          setState(() => _toggling = true);
                          final err = await context.read<AppState>().toggleSchedule(s);
                          if (!mounted) return;
                          setState(() => _toggling = false);
                          if (err != null) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                          }
                        },
                      ),
                GestureDetector(
                  onTap: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: Text(context.tr('schedules_delete_title')),
                        content: Text(context.tr('schedules_delete_confirm').replaceAll('{name}', s.name)),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr('common_cancel'))),
                          FilledButton(
                            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
                            onPressed: () => Navigator.pop(ctx, true),
                            child: Text(context.tr('common_delete')),
                          ),
                        ],
                      ),
                    );
                    if (confirm != true || !mounted) return;
                    final err = await context.read<AppState>().deleteSchedule(s.id);
                    if (!mounted) return;
                    if (err != null) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                    }
                  },
                  child: Icon(Icons.delete_outline, size: 18, color: AppColors.subtext),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AddScheduleSheet extends StatefulWidget {
  const _AddScheduleSheet();

  @override
  State<_AddScheduleSheet> createState() => _AddScheduleSheetState();
}

class _AddScheduleSheetState extends State<_AddScheduleSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _durationCtrl = TextEditingController();

  int? _selectedActuatorId;
  TimeOfDay _startTime = const TimeOfDay(hour: 6, minute: 0);
  Set<int> _days = {0, 1, 2, 3, 4, 5, 6};
  bool _submitting = false;
  String? _error;

  static const _dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _durationCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(context: context, initialTime: _startTime);
    if (t != null) setState(() => _startTime = t);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedActuatorId == null) {
      setState(() => _error = context.tr('schedules_select_actuator'));
      return;
    }
    if (_days.isEmpty) {
      setState(() => _error = context.tr('schedules_select_day'));
      return;
    }
    setState(() { _submitting = true; _error = null; });
    final timeStr = '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}:00';
    final err = await context.read<AppState>().createSchedule(
      actuatorId: _selectedActuatorId!,
      name: _nameCtrl.text.trim(),
      daysOfWeek: _days.toList()..sort(),
      startTime: timeStr,
      durationMinutes: int.parse(_durationCtrl.text),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (err != null) {
      setState(() => _error = err);
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final inp = InputDecoration(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    );

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(context.tr('schedules_add_tooltip'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: inp.copyWith(labelText: context.tr('schedules_name_label')),
                validator: (v) => (v == null || v.trim().isEmpty) ? context.tr('common_required') : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: _selectedActuatorId,
                decoration: inp.copyWith(labelText: context.tr('schedules_actuator_label')),
                items: state.actuators.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
                onChanged: (v) => setState(() => _selectedActuatorId = v),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _pickTime,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.access_time, size: 18, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(_startTime.format(context), style: const TextStyle(fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _durationCtrl,
                      decoration: inp.copyWith(labelText: context.tr('schedules_duration_label')),
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return context.tr('common_required');
                        if (int.tryParse(v) == null || int.parse(v) < 1) return context.tr('common_invalid');
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(context.tr('schedules_repeat_on'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Row(
                children: List.generate(7, (i) {
                  final active = _days.contains(i);
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => active ? _days.remove(i) : _days.add(i)),
                      child: Container(
                        margin: EdgeInsets.only(right: i < 6 ? 4 : 0),
                        height: 36,
                        decoration: BoxDecoration(
                          color: active ? AppColors.success : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _dayLabels[i],
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: active ? Colors.white : AppColors.subtext,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.success,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(context.tr('schedules_add_tooltip'), style: const TextStyle(fontSize: 13)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
