/** Versioned schema migrations. Never edit an applied migration — append a new one. */
export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,            -- e.g. "55101"
  title TEXT NOT NULL,
  short TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'indigo',
  semester TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,             -- pdf | docx | txt
  stored_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0,
  page_offset INTEGER NOT NULL DEFAULT 0, -- pdfPage = printedPage + offset
  word_count INTEGER NOT NULL DEFAULT 0,
  ke INTEGER,                     -- Kurseinheit number if detected
  status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | error
  error TEXT,
  uploaded_at TEXT NOT NULL
);
CREATE UNIQUE INDEX documents_sha ON documents(sha256);

CREATE TABLE pages (
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (doc_id, page)
);

-- full text index (BM25) for retrieval-augmented generation and search
CREATE VIRTUAL TABLE pages_fts USING fts5(
  text, doc_id UNINDEXED, page UNINDEXED,
  tokenize = "unicode61 remove_diacritics 0"
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,            -- "55101-ke2-s2-ii"
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  doc_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  parent_id TEXT,
  ke INTEGER,
  level INTEGER NOT NULL,
  marker TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  pdf_start INTEGER,
  pdf_end INTEGER,
  printed_start INTEGER,
  words INTEGER NOT NULL DEFAULT 0,
  est_minutes INTEGER NOT NULL DEFAULT 0,
  difficulty INTEGER NOT NULL DEFAULT 2,     -- 1 easy .. 3 hard
  exam_weight INTEGER NOT NULL DEFAULT 2,    -- 1 low .. 3 high
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX topics_module ON topics(module_id, sort);

CREATE TABLE topic_progress (
  topic_id TEXT PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new',  -- new | learning | studied
  minutes_spent REAL NOT NULL DEFAULT 0,
  first_studied_at TEXT,
  last_studied_at TEXT
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  topic_ids TEXT NOT NULL,        -- JSON array
  title TEXT NOT NULL,
  json TEXT NOT NULL,             -- LessonPack JSON
  origin TEXT NOT NULL DEFAULT 'seed', -- seed | ai | user
  created_at TEXT NOT NULL
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT,
  item_id TEXT NOT NULL,
  topic_id TEXT,
  module_id TEXT,
  type TEXT NOT NULL,             -- mc-single, ..., gutachten-obersatz, klausur
  level TEXT NOT NULL,            -- recognize | recall | understand | apply | formulate
  difficulty INTEGER NOT NULL DEFAULT 1,
  score REAL NOT NULL,            -- 0..1
  correct INTEGER NOT NULL,       -- 1 if score >= 0.8
  hints_used INTEGER NOT NULL DEFAULT 0,
  answer TEXT,
  feedback TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX attempts_topic ON attempts(topic_id, created_at);

CREATE TABLE mistakes (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  module_id TEXT,
  category TEXT NOT NULL,         -- inhaltlich | methodisch | sprachlich
  description TEXT NOT NULL,
  origin TEXT NOT NULL,           -- quiz | gutachten | klausur | tutor
  ref_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  topic_id TEXT,
  lesson_id TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  src TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'seed', -- seed | ai | user
  fsrs TEXT,                      -- serialized FSRS card state
  due TEXT,                       -- ISO date, null = not yet introduced
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX flashcards_due ON flashcards(due);

CREATE TABLE card_reviews (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,        -- 1 again, 2 hard, 3 good, 4 easy
  reviewed_at TEXT NOT NULL
);

CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,             -- YYYY-MM-DD
  plan TEXT NOT NULL,             -- JSON SessionPlan
  status TEXT NOT NULL DEFAULT 'planned', -- planned | running | done | skipped
  started_at TEXT,
  finished_at TEXT,
  minutes REAL NOT NULL DEFAULT 0,
  log TEXT NOT NULL DEFAULT '[]'  -- JSON per block: actual minutes
);
CREATE INDEX study_sessions_date ON study_sessions(date);

CREATE TABLE deadlines (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  kind TEXT NOT NULL,             -- anmeldung | ruecktritt | einsendeaufgabe | hausarbeit | klausur | belegung | sonstiges
  title TEXT NOT NULL,
  date TEXT NOT NULL,             -- YYYY-MM-DD (start)
  end_date TEXT,
  time TEXT,
  status TEXT NOT NULL DEFAULT 'unconfirmed', -- confirmed | unconfirmed
  source TEXT,                    -- URL or "eigene Angabe"
  note TEXT,
  required_for_admission TEXT NOT NULL DEFAULT 'unknown', -- yes | no | unknown
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  module_id TEXT,
  topic_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,             -- user | assistant
  content TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  facts TEXT NOT NULL,
  question TEXT NOT NULL,
  solution TEXT,                  -- JSON model solution
  duration_min INTEGER NOT NULL,
  started_at TEXT,
  submitted_at TEXT,
  answer TEXT NOT NULL DEFAULT '',
  evaluation TEXT,                -- JSON
  src TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  topic_id TEXT,
  doc_id TEXT,
  page INTEGER,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ai_usage (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL,
  created_at TEXT NOT NULL
);
`,
  },
  {
    version: 2,
    sql: `
ALTER TABLE topics ADD COLUMN kind TEXT NOT NULL DEFAULT 'study';
ALTER TABLE topics ADD COLUMN placeholder INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deadlines ADD COLUMN covers TEXT;          -- JSON {ke:[..]} | {all:true} → planner milestone
ALTER TABLE deadlines ADD COLUMN prep_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deadlines ADD COLUMN work_minutes INTEGER;
`,
  },
  {
    version: 3,
    sql: `
ALTER TABLE documents ADD COLUMN doc_key TEXT;          -- canonical reference used in lesson sources, e.g. BGB_2
CREATE INDEX documents_key ON documents(doc_key);
`,
  },
];
