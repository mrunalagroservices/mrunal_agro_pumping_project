import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Centralized haptic + sound feedback for real-time pump events (motor
/// start/stop, mains power cut/restore, a device dropping offline
/// unexpectedly, emergency stop). Plays short synthesized tones bundled as
/// assets — `SystemSound.play()` was tried first but is near-silent on most
/// Android devices unless "touch sounds" happens to be enabled, so this
/// plays real audio through the media/playback audio session instead, which
/// also lets it sound even with the iOS silent switch on (important for an
/// alert the operator is meant to actually notice).
class FeedbackService {
  // A dedicated AudioCache instance (rather than mutating the shared
  // AudioCache.instance singleton's prefix) so this doesn't affect any other
  // audio playback elsewhere in the app.
  static final AudioPlayer _player = AudioPlayer()
    ..audioCache = AudioCache(prefix: 'assets/sounds/');

  static bool _contextSet = false;

  static Future<void> _ensureAudioContext() async {
    if (_contextSet) return;
    _contextSet = true;
    await _player.setAudioContext(
      AudioContext(
        iOS: AudioContextIOS(
          category: AVAudioSessionCategory.playback,
          options: const {AVAudioSessionOptions.mixWithOthers},
        ),
        android: AudioContextAndroid(
          contentType: AndroidContentType.sonification,
          usageType: AndroidUsageType.notification,
          audioFocus: AndroidAudioFocus.gainTransient,
        ),
      ),
    );
  }

  static Future<void> _play(String fileName) async {
    try {
      await _ensureAudioContext();
      await _player.stop();
      await _player.play(AssetSource(fileName));
    } catch (e) {
      // Surfaced via debugPrint rather than swallowed — a MissingPluginException
      // here usually means the app binary was hot-reloaded/restarted instead of
      // fully rebuilt after audioplayers was added, so its native side never
      // got linked in. A full stop + `flutter run` (not hot reload) fixes that.
      debugPrint('[FeedbackService] failed to play $fileName: $e');
    }
  }

  static void motorStarted() {
    debugPrint('[FeedbackService] motorStarted (haptic + success.wav)');
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static void motorStopped() {
    debugPrint('[FeedbackService] motorStopped (haptic + stop.wav)');
    HapticFeedback.lightImpact();
    _play('stop.wav');
  }

  static void powerRestored() {
    debugPrint('[FeedbackService] powerRestored (haptic + success.wav)');
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static void powerCut() {
    debugPrint('[FeedbackService] powerCut (haptic + alert.wav)');
    HapticFeedback.heavyImpact();
    _play('alert.wav');
  }

  static void connectionLost() {
    debugPrint('[FeedbackService] connectionLost (haptic + alert.wav)');
    HapticFeedback.heavyImpact();
    _play('alert.wav');
  }

  static void connectionRestored() {
    debugPrint('[FeedbackService] connectionRestored (haptic + success.wav)');
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static Future<void> emergencyStop() async {
    debugPrint('[FeedbackService] emergencyStop (haptic x2 + alert.wav)');
    HapticFeedback.heavyImpact();
    await _play('alert.wav');
    await Future.delayed(const Duration(milliseconds: 350));
    HapticFeedback.heavyImpact();
  }
}
