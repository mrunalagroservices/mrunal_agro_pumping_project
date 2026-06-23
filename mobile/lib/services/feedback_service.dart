import 'package:flutter/services.dart';

/// Centralized haptic + sound feedback for real-time pump events (motor
/// start/stop, mains power cut/restore, a device dropping offline
/// unexpectedly, emergency stop). Uses the platform's built-in haptic
/// engine and system click/alert sounds rather than bundled audio assets,
/// so it works out of the box on both iOS and Android with no extra
/// permissions or files. Swap in custom branded sound files later via the
/// `audioplayers` package if desired — every call site already goes
/// through this one class.
class FeedbackService {
  static void motorStarted() {
    HapticFeedback.mediumImpact();
    SystemSound.play(SystemSoundType.click);
  }

  static void motorStopped() {
    HapticFeedback.lightImpact();
    SystemSound.play(SystemSoundType.click);
  }

  static void powerRestored() {
    HapticFeedback.mediumImpact();
    SystemSound.play(SystemSoundType.click);
  }

  static void powerCut() {
    HapticFeedback.heavyImpact();
    SystemSound.play(SystemSoundType.alert);
  }

  static void connectionLost() {
    HapticFeedback.heavyImpact();
    SystemSound.play(SystemSoundType.alert);
  }

  static void connectionRestored() {
    HapticFeedback.mediumImpact();
    SystemSound.play(SystemSoundType.click);
  }

  static Future<void> emergencyStop() async {
    HapticFeedback.heavyImpact();
    SystemSound.play(SystemSoundType.alert);
    await Future.delayed(const Duration(milliseconds: 150));
    HapticFeedback.heavyImpact();
    SystemSound.play(SystemSoundType.alert);
  }
}
