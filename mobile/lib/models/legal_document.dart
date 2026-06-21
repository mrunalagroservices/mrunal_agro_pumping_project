class LegalSection {
  final String heading;
  final String body;
  LegalSection({required this.heading, required this.body});

  factory LegalSection.fromJson(Map<String, dynamic> json) {
    return LegalSection(
      heading: json['heading'] as String? ?? '',
      body: json['body'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'heading': heading, 'body': body};
}

class LegalDocument {
  final String slug;
  final String title;
  final String updatedAt;
  final List<LegalSection> sections;

  LegalDocument({required this.slug, required this.title, required this.updatedAt, required this.sections});

  factory LegalDocument.fromJson(Map<String, dynamic> json) {
    return LegalDocument(
      slug: json['slug'] as String,
      title: json['title'] as String? ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
      sections: (json['sections'] as List? ?? [])
          .map((s) => LegalSection.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }
}

class LegalDocumentSummary {
  final String slug;
  final String title;
  final String updatedAt;
  LegalDocumentSummary({required this.slug, required this.title, required this.updatedAt});

  factory LegalDocumentSummary.fromJson(Map<String, dynamic> json) {
    return LegalDocumentSummary(
      slug: json['slug'] as String,
      title: json['title'] as String? ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
    );
  }
}
