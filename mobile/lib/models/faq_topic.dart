class FaqTopic {
  final int id;
  final String question;
  final String answer;
  final int sortOrder;

  FaqTopic({required this.id, required this.question, required this.answer, this.sortOrder = 0});

  factory FaqTopic.fromJson(Map<String, dynamic> json) {
    return FaqTopic(
      id: json['id'] as int,
      question: json['question'] as String? ?? '',
      answer: json['answer'] as String? ?? '',
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }
}

class SupportContact {
  final String? email;
  final String? phone;
  final String? hours;
  SupportContact({this.email, this.phone, this.hours});

  factory SupportContact.fromJson(Map<String, dynamic> json) {
    return SupportContact(
      email: json['support_email'] as String?,
      phone: json['support_phone'] as String?,
      hours: json['support_hours'] as String?,
    );
  }
}
