import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App shows the login screen when logged out', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MrunalAgroApp());
    await tester.pump();

    expect(find.text('Sign in to manage your farm pumps'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
