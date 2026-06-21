import 'package:flutter/material.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class LegalDoc {
  final String title;
  final String updated;
  final List<LegalSection> sections;
  const LegalDoc({required this.title, required this.updated, required this.sections});
}

class LegalSection {
  final String heading;
  final String body;
  const LegalSection(this.heading, this.body);
}

// NOTE: placeholder copy — written to reflect what this app actually does
// (farms, devices, orders, payments). Have a lawyer review before launch.
const termsOfServiceDoc = LegalDoc(
  title: 'Terms of Service',
  updated: 'Last updated 1 June 2026',
  sections: [
    LegalSection('1. Acceptance of terms',
        "By creating an account or using the Mrunal Agro app, you agree to these Terms of Service. "
        "If you don't agree, please don't use the app."),
    LegalSection('2. What Mrunal Agro provides',
        "Mrunal Agro lets you monitor and control irrigation pumps and devices on your farms, view "
        "runtime and electricity-usage history, and buy farm supplies through our marketplace. Some "
        "features depend on third-party hardware (ESP32 controllers, sensors) that you install and "
        "maintain at your own property."),
    LegalSection('3. Your account',
        "You're responsible for keeping your login credentials secure and for all activity under your "
        "account. Tell us immediately if you suspect unauthorised access."),
    LegalSection('4. Orders and payments',
        "Prices shown in the Market are in Indian Rupees and include applicable taxes unless stated "
        "otherwise. Orders are confirmed once payment is verified. Cash on Delivery orders may incur a "
        "handling fee, shown at checkout. We aim to deliver as estimated but delivery dates are not "
        "guaranteed."),
    LegalSection('5. Device control and liability',
        "You control real irrigation hardware through this app. We do our best to keep device status "
        "and schedules accurate, but network or hardware issues can delay commands or readings. Don't "
        "rely solely on the app for time-critical safety decisions (e.g. flooding, electrical faults) — "
        "always have a manual fallback at the pump site."),
    LegalSection('6. Cancellations and refunds',
        "Orders can be cancelled before they're shipped from the Orders screen. Once an order is "
        "shipped, contact support to discuss returns. Refunds, where applicable, are issued to the "
        "original payment method."),
    LegalSection('7. Account suspension',
        "We may suspend or terminate accounts that violate these terms, attempt to interfere with "
        "other users' devices, or misuse the marketplace."),
    LegalSection('8. Changes to these terms',
        "We may update these terms as the app evolves. We'll let you know about material changes "
        "in the app before they take effect."),
    LegalSection('9. Contact',
        "Questions about these terms? Reach us at support@mrunalagro.in."),
  ],
);

const privacyPolicyDoc = LegalDoc(
  title: 'Privacy Policy',
  updated: 'Last updated 1 June 2026',
  sections: [
    LegalSection('1. What we collect',
        "Account details you give us (name, phone, email), farm and device data you add (locations, "
        "pump specs, schedules), order and payment history, and basic usage analytics if you've left "
        "that turned on in Privacy settings."),
    LegalSection('2. How we use it',
        "To operate your farms and devices, process orders, send service notifications (e.g. pump "
        "offline, schedule ran), and improve the app. We do not sell your personal data."),
    LegalSection('3. Device and location data',
        "Farm GPS coordinates and device telemetry (on/off events, runtime) are stored to power the "
        "dashboard, history, and analytics features. This data stays tied to your account and the "
        "organisation you belong to."),
    LegalSection('4. Sharing with third parties',
        "We share order details with payment processors and logistics partners only as needed to "
        "fulfil your order. We don't share your farm or device data with marketing third parties."),
    LegalSection('5. Data retention',
        "We keep your data while your account is active. If you request account deletion, we schedule "
        "permanent removal of your farms, devices, and order history after a grace period, during "
        "which you can cancel the deletion."),
    LegalSection('6. Your rights',
        "You can request a copy of your personal data or ask us to delete your account at any time "
        "from Privacy settings. We'll respond to data export requests by email."),
    LegalSection('7. Security',
        "We use encrypted connections (HTTPS) between the app, our servers, and your devices, and "
        "store passwords using one-way hashing — we never store your raw password."),
    LegalSection('8. Contact',
        "Privacy questions? Reach us at support@mrunalagro.in."),
  ],
);

const communityGuidelinesDoc = LegalDoc(
  title: 'Community Guidelines',
  updated: 'Last updated 1 June 2026',
  sections: [
    LegalSection('Be honest in reviews',
        "Only review products you've actually purchased and received. Don't post fake reviews or pay "
        "for positive ones."),
    LegalSection('Respect other sellers and support staff',
        "Keep communication with support and dealers respectful. Abusive behaviour can result in "
        "account suspension."),
    LegalSection("Don't misuse shared devices",
        "If your account has access to a shared farm or organisation, only control devices you're "
        "authorised to operate."),
    LegalSection('Report problems, don’t self-resolve disputes',
        "If an order or device issue needs resolving, contact support rather than leaving retaliatory "
        "reviews or repeatedly toggling another user's devices."),
  ],
);

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final docs = [termsOfServiceDoc, privacyPolicyDoc, communityGuidelinesDoc];

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
                    child: Text('Legal',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                itemCount: docs.length,
                separatorBuilder: (_, _) => const Divider(height: 1, thickness: 1, color: _P.divider),
                itemBuilder: (context, i) {
                  final doc = docs[i];
                  return InkWell(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => LegalDocScreen(doc: doc))),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(doc.title,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: _P.text)),
                          ),
                          const Icon(Icons.chevron_right, color: _P.subtext),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LegalDocScreen extends StatelessWidget {
  final LegalDoc doc;
  const LegalDocScreen({super.key, required this.doc});

  @override
  Widget build(BuildContext context) {
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
                  Expanded(
                    child: Text(doc.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: _P.text)),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
                children: [
                  Text(doc.updated, style: const TextStyle(fontSize: 11, color: _P.subtext)),
                  const SizedBox(height: 16),
                  for (final section in doc.sections) ...[
                    Text(section.heading,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _P.text)),
                    const SizedBox(height: 6),
                    Text(section.body,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.45)),
                    const SizedBox(height: 18),
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
