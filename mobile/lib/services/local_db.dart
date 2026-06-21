import 'dart:convert';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

/// Offline cache for content that lives in Postgres on the backend
/// (legal documents, FAQ topics, support contact info) so these screens
/// still work without a network connection and load instantly on warm
/// start. The backend is always the source of truth — this is a cache,
/// refreshed opportunistically whenever the app can reach the network.
class LocalDb {
  static final LocalDb instance = LocalDb._();
  LocalDb._();

  Database? _db;

  Future<Database> get _database async {
    final existing = _db;
    if (existing != null) return existing;
    final db = await _open();
    _db = db;
    return db;
  }

  Future<Database> _open() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'mrunal_agro_cache.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE legal_documents (
            slug TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sections TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE faq_topics (
            id INTEGER PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE support_contact (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            support_email TEXT,
            support_phone TEXT,
            support_hours TEXT
          )
        ''');
      },
    );
  }

  // ── Legal documents ──────────────────────────────────────────────────────
  Future<void> saveLegalDocument(Map<String, dynamic> doc) async {
    final db = await _database;
    await db.insert('legal_documents', {
      'slug': doc['slug'],
      'title': doc['title'],
      'sections': jsonEncode(doc['sections']),
      'updated_at': doc['updated_at'] ?? '',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> saveLegalDocumentSummaries(List<dynamic> docs) async {
    final db = await _database;
    final batch = db.batch();
    for (final d in docs) {
      final doc = d as Map<String, dynamic>;
      batch.insert('legal_documents', {
        'slug': doc['slug'],
        'title': doc['title'],
        // Keep any previously cached sections if we only have the summary.
        'sections': jsonEncode(const []),
        'updated_at': doc['updated_at'] ?? '',
      }, conflictAlgorithm: ConflictAlgorithm.ignore);
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getLegalDocumentSummaries() async {
    final db = await _database;
    return db.query('legal_documents', columns: ['slug', 'title', 'updated_at'], orderBy: 'title');
  }

  Future<Map<String, dynamic>?> getLegalDocument(String slug) async {
    final db = await _database;
    final rows = await db.query('legal_documents', where: 'slug = ?', whereArgs: [slug]);
    if (rows.isEmpty) return null;
    final row = rows.first;
    return {
      'slug': row['slug'],
      'title': row['title'],
      'sections': jsonDecode(row['sections'] as String),
      'updated_at': row['updated_at'],
    };
  }

  // ── FAQ topics ───────────────────────────────────────────────────────────
  Future<void> saveFaqTopics(List<dynamic> topics) async {
    final db = await _database;
    await db.delete('faq_topics');
    final batch = db.batch();
    for (final t in topics) {
      final topic = t as Map<String, dynamic>;
      batch.insert('faq_topics', {
        'id': topic['id'],
        'question': topic['question'],
        'answer': topic['answer'],
        'sort_order': topic['sort_order'] ?? 0,
      });
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getFaqTopics() async {
    final db = await _database;
    return db.query('faq_topics', orderBy: 'sort_order ASC');
  }

  // ── Support contact ──────────────────────────────────────────────────────
  Future<void> saveSupportContact(Map<String, dynamic> contact) async {
    final db = await _database;
    await db.insert('support_contact', {
      'id': 1,
      'support_email': contact['support_email'],
      'support_phone': contact['support_phone'],
      'support_hours': contact['support_hours'],
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Map<String, dynamic>?> getSupportContact() async {
    final db = await _database;
    final rows = await db.query('support_contact', where: 'id = 1');
    return rows.isEmpty ? null : rows.first;
  }
}
