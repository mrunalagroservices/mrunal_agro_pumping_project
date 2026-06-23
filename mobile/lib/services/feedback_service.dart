import 'package:audioplayers/audioplayers.dart';
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
    } catch (_) {
      // Best-effort — haptics still fire even if audio playback fails
      // (e.g. no audio asset bundled on an unsupported platform).
    }
  }

  static void motorStarted() {
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static void motorStopped() {
    HapticFeedback.lightImpact();
    _play('stop.wav');
  }

  static void powerRestored() {
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static void powerCut() {
    HapticFeedback.heavyImpact();
    _play('alert.wav');
  }

  static void connectionLost() {
    HapticFeedback.heavyImpact();
    _play('alert.wav');
  }

  static void connectionRestored() {
    HapticFeedback.mediumImpact();
    _play('success.wav');
  }

  static Future<void> emergencyStop() async {
    HapticFeedback.heavyImpact();
    await _play('alert.wav');
    await Future.delayed(const Duration(milliseconds: 350));
    HapticFeedback.heavyImpact();
  }
}
