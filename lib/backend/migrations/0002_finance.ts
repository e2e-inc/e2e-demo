export default String.raw`PRAGMA foreign_keys = ON;

CREATE TABLE finance_profile (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  bio TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  legal_name TEXT,
  date_of_birth TEXT,
  ssn_last4 TEXT,
  address TEXT,
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance_friendship (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  friend_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_user_id)
);

CREATE TABLE finance_funding_source (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bank', 'debit_card')),
  label TEXT NOT NULL,
  institution TEXT NOT NULL,
  last4 TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX finance_funding_source_user_idx ON finance_funding_source(user_id);

CREATE TABLE finance_merchant (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  emoji TEXT NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  tagline TEXT NOT NULL
);

CREATE TABLE finance_split (
  id TEXT PRIMARY KEY NOT NULL,
  creator_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL,
  note TEXT NOT NULL,
  emoji TEXT,
  participant_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance_transaction (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('payment', 'add_money', 'transfer_out', 'merchant', 'card_purchase')
  ),
  from_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  to_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  merchant_id TEXT REFERENCES finance_merchant(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  fee_cents INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  emoji TEXT,
  privacy TEXT NOT NULL DEFAULT 'friends'
    CHECK (privacy IN ('public', 'friends', 'private')),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'failed')),
  funding_source_id TEXT REFERENCES finance_funding_source(id) ON DELETE SET NULL,
  funding_label TEXT,
  speed TEXT CHECK (speed IN ('instant', 'standard')),
  split_id TEXT REFERENCES finance_split(id) ON DELETE SET NULL,
  request_id TEXT,
  channel TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX finance_transaction_from_idx ON finance_transaction(from_user_id);
CREATE INDEX finance_transaction_to_idx ON finance_transaction(to_user_id);
CREATE INDEX finance_transaction_created_idx ON finance_transaction(created_at);

CREATE TABLE finance_request (
  id TEXT PRIMARY KEY NOT NULL,
  requester_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  payer_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  note TEXT NOT NULL DEFAULT '',
  emoji TEXT,
  privacy TEXT NOT NULL DEFAULT 'friends'
    CHECK (privacy IN ('public', 'friends', 'private')),
  split_id TEXT REFERENCES finance_split(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'declined', 'cancelled')),
  transaction_id TEXT REFERENCES finance_transaction(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE INDEX finance_request_requester_idx ON finance_request(requester_id);
CREATE INDEX finance_request_payer_idx ON finance_request(payer_id);

CREATE TABLE finance_card (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  last4 TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  design TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  spend_limit_cents INTEGER,
  credit_limit_cents INTEGER,
  physical_status TEXT NOT NULL DEFAULT 'not_ordered'
    CHECK (physical_status IN ('not_ordered', 'ordered', 'shipped', 'activated')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX finance_card_user_idx ON finance_card(user_id);

CREATE TABLE finance_qr_token (
  token TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('pay', 'request')),
  amount_cents INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- Demo people (not loginable; no account rows)
INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES
  ('demo_ava', 'Ava Chen', 'ava@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_marcus', 'Marcus Reed', 'marcus@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_priya', 'Priya Patel', 'priya@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_leo', 'Leo Alvarez', 'leo@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_nia', 'Nia Okafor', 'nia@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_sam', 'Sam Torres', 'sam@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_jules', 'Jules Kim', 'jules@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_hana', 'Hana Sato', 'hana@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_theo', 'Theo Brooks', 'theo@testerpay.demo', 1, 1756000000000, 1756000000000),
  ('demo_zoe', 'Zoe Martin', 'zoe@testerpay.demo', 1, 1756000000000, 1756000000000);

INSERT INTO app_membership (app_id, user_id, role) VALUES
  ('finance', 'demo_ava', 'member'),
  ('finance', 'demo_marcus', 'member'),
  ('finance', 'demo_priya', 'member'),
  ('finance', 'demo_leo', 'member'),
  ('finance', 'demo_nia', 'member'),
  ('finance', 'demo_sam', 'member'),
  ('finance', 'demo_jules', 'member'),
  ('finance', 'demo_hana', 'member'),
  ('finance', 'demo_theo', 'member'),
  ('finance', 'demo_zoe', 'member');

INSERT INTO finance_profile
  (user_id, handle, display_name, avatar_color, bio, verification_status, balance_cents, is_demo)
VALUES
  ('demo_ava', 'ava-chen', 'Ava Chen', '#9969FA', 'Coffee first, questions later ☕️', 'verified', 48250, 1),
  ('demo_marcus', 'marcus-reed', 'Marcus Reed', '#FB5E1B', 'Runs on tacos 🌮', 'verified', 12000, 1),
  ('demo_priya', 'priya-patel', 'Priya Patel', '#42E69F', 'Plant mom 🌿', 'verified', 30500, 1),
  ('demo_leo', 'leo-alvarez', 'Leo Alvarez', '#4BB4FF', 'Concert junkie 🎸', 'verified', 9900, 1),
  ('demo_nia', 'nia-okafor', 'Nia Okafor', '#E074FF', 'Brunch committee chair 🥞', 'verified', 22100, 1),
  ('demo_sam', 'sam-torres', 'Sam Torres', '#FCBA1E', 'Road trips & road snacks 🚗', 'verified', 5600, 1),
  ('demo_jules', 'jules-kim', 'Jules Kim', '#3F34EE', 'Pizza night regular 🍕', 'verified', 17800, 1),
  ('demo_hana', 'hana-sato', 'Hana Sato', '#D52B9C', 'Weekend hiker 🥾', 'verified', 41000, 1),
  ('demo_theo', 'theo-brooks', 'Theo Brooks', '#B2E847', 'Always the DD 🚙', 'verified', 8000, 1),
  ('demo_zoe', 'zoe-martin', 'Zoe Martin', '#4CF0EB', 'Movie marathon host 🍿', 'verified', 26400, 1);

INSERT INTO finance_merchant (id, name, category, color, emoji, qr_code, tagline) VALUES
  ('m_bloom', 'Bloom Coffee Roasters', 'Coffee', '#FB5E1B', '☕️', 'PPZ-M-BLOOM', 'Single-origin pour-overs since 2016'),
  ('m_taqueria', 'La Esquina Taqueria', 'Food', '#FCBA1E', '🌮', 'PPZ-M-TAQ', 'Street tacos, all day'),
  ('m_pedal', 'Pedal & Spoke', 'Cycling', '#42E69F', '🚲', 'PPZ-M-PEDAL', 'Repairs, rentals, and rides'),
  ('m_noodle', 'Noodle Theory', 'Food', '#E074FF', '🍜', 'PPZ-M-NOODLE', 'Hand-pulled noodles nightly'),
  ('m_vinyl', 'Groove Records', 'Music', '#9969FA', '🎵', 'PPZ-M-VINYL', 'New and used vinyl'),
  ('m_market', 'Sunday Farmstand', 'Groceries', '#B2E847', '🥕', 'PPZ-M-FARM', 'Local produce every weekend'),
  ('m_cinema', 'Lumen Cinema', 'Entertainment', '#3F34EE', '🎬', 'PPZ-M-LUMEN', 'Indie films & popcorn'),
  ('m_fit', 'Ridgeline Climbing', 'Fitness', '#4BB4FF', '🧗', 'PPZ-M-RIDGE', 'Day passes and memberships');

INSERT INTO finance_friendship (user_id, friend_user_id) VALUES
  ('demo_ava', 'demo_marcus'), ('demo_marcus', 'demo_ava'),
  ('demo_ava', 'demo_priya'), ('demo_priya', 'demo_ava'),
  ('demo_ava', 'demo_leo'), ('demo_leo', 'demo_ava'),
  ('demo_marcus', 'demo_nia'), ('demo_nia', 'demo_marcus'),
  ('demo_priya', 'demo_hana'), ('demo_hana', 'demo_priya'),
  ('demo_leo', 'demo_sam'), ('demo_sam', 'demo_leo'),
  ('demo_jules', 'demo_zoe'), ('demo_zoe', 'demo_jules'),
  ('demo_theo', 'demo_nia'), ('demo_nia', 'demo_theo');

INSERT INTO finance_transaction
  (id, kind, from_user_id, to_user_id, amount_cents, note, emoji, privacy, created_at)
VALUES
  ('seed_t1', 'payment', 'demo_ava', 'demo_marcus', 1850, 'Taco Tuesday', '🌮', 'public', datetime('now', '-2 hours')),
  ('seed_t2', 'payment', 'demo_priya', 'demo_hana', 4200, 'Trail snacks + gas', '⛽️', 'public', datetime('now', '-5 hours')),
  ('seed_t3', 'payment', 'demo_leo', 'demo_sam', 12000, 'Concert tickets!!', '🎸', 'public', datetime('now', '-1 day')),
  ('seed_t4', 'payment', 'demo_nia', 'demo_marcus', 3400, 'Brunch 🥞', '🥞', 'public', datetime('now', '-1 day', '-3 hours')),
  ('seed_t5', 'payment', 'demo_zoe', 'demo_jules', 2600, 'Pizza night', '🍕', 'public', datetime('now', '-2 days')),
  ('seed_t6', 'payment', 'demo_theo', 'demo_nia', 1500, 'Parking', '🅿️', 'public', datetime('now', '-3 days')),
  ('seed_t7', 'payment', 'demo_hana', 'demo_ava', 9000, 'Cabin deposit', '🏕️', 'public', datetime('now', '-4 days')),
  ('seed_t8', 'payment', 'demo_marcus', 'demo_leo', 800, 'Coffee ☕️', '☕️', 'public', datetime('now', '-5 days'));
`;
