CREATE TABLE IF NOT EXISTS tours(
id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT UNIQUE NOT NULL,image_folder TEXT,
card_thumbnail INTEGER DEFAULT 1,title_en TEXT,title_es TEXT,short_desc_en TEXT,short_desc_es TEXT,price_from INTEGER,
subtitle_en TEXT,subtitle_es TEXT,description_en TEXT,description_es TEXT,hero_image INTEGER DEFAULT 1,
price_adults_label_en TEXT,price_adults_label_es TEXT,price_adult_price_label_en TEXT,price_adult_price_label_es TEXT,
price_child_price_label_en TEXT,price_child_price_label_es TEXT,
child_price_flat INTEGER,free_child_note_en TEXT,free_child_note_es TEXT,
group_note_en TEXT,group_note_es TEXT,pricing_note_en TEXT,pricing_note_es TEXT,
itinerary_title_en TEXT DEFAULT 'Itinerary',itinerary_title_es TEXT DEFAULT 'Itinerario',
itinerary_warning_en TEXT,itinerary_warning_es TEXT,combo_note_en TEXT,combo_note_es TEXT,
booking_desc_en TEXT,booking_desc_es TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS gallery_images(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,image_num INTEGER,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS pricing_tiers(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,adults INTEGER,adult_price INTEGER,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tour_includes(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,text_en TEXT,text_es TEXT,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tour_excludes(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,text_en TEXT,text_es TEXT,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS itinerary_steps(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,step_order INTEGER,text_en TEXT,text_es TEXT,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS addons(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,slug TEXT,title_en TEXT,title_es TEXT,desc_en TEXT,desc_es TEXT,price_per_person INTEGER,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS packing_items(id INTEGER PRIMARY KEY AUTOINCREMENT,tour_id INTEGER NOT NULL,text_en TEXT,text_es TEXT,icon TEXT,FOREIGN KEY(tour_id) REFERENCES tours(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS hotels(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,zone TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_name TEXT,customer_email TEXT,customer_phone TEXT,tour_date TEXT,pickup_time TEXT,hotel TEXT,comments TEXT,cart_json TEXT,total_usd INTEGER,status TEXT DEFAULT 'pending',created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(
id INTEGER PRIMARY KEY AUTOINCREMENT,
public_id TEXT UNIQUE NOT NULL,
user_id TEXT,
guest_name TEXT,
guest_email TEXT NOT NULL,
guest_phone TEXT,
currency TEXT NOT NULL DEFAULT 'USD',
total INTEGER NOT NULL DEFAULT 0,
subtotal REAL NOT NULL DEFAULT 0,
fee_percent REAL NOT NULL DEFAULT 0,
fee_amount REAL NOT NULL DEFAULT 0,
total_final REAL NOT NULL DEFAULT 0,
status TEXT NOT NULL DEFAULT 'pending_payment',
payment_method TEXT NOT NULL,
provider_status TEXT,
paypal_intent TEXT,
bank_reference TEXT,
expires_at DATETIME,
service_date TEXT,
pickup_time TEXT,
hotel TEXT,
comments TEXT,
source TEXT DEFAULT 'checkout',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_public_id ON orders(public_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

CREATE TABLE IF NOT EXISTS customer_profiles(
id INTEGER PRIMARY KEY AUTOINCREMENT,
public_id TEXT UNIQUE NOT NULL,
email TEXT UNIQUE NOT NULL,
full_name TEXT,
password_hash TEXT,
avatar_url TEXT,
last_login_at DATETIME,
email_verified_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);

CREATE TABLE IF NOT EXISTS customer_identities(
id INTEGER PRIMARY KEY AUTOINCREMENT,
profile_public_id TEXT NOT NULL,
provider TEXT NOT NULL,
provider_user_id TEXT NOT NULL,
email TEXT,
email_verified_at DATETIME,
metadata_json TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(profile_public_id) REFERENCES customer_profiles(public_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_identities_provider_user ON customer_identities(provider, provider_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_identities_profile_provider ON customer_identities(profile_public_id, provider);
CREATE INDEX IF NOT EXISTS idx_customer_identities_profile ON customer_identities(profile_public_id);

CREATE TABLE IF NOT EXISTS customer_auth_codes(
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT NOT NULL,
code_hash TEXT NOT NULL,
purpose TEXT NOT NULL DEFAULT 'login',
expires_at DATETIME NOT NULL,
consumed_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_auth_codes_email ON customer_auth_codes(email);

CREATE TABLE IF NOT EXISTS customer_sessions(
id INTEGER PRIMARY KEY AUTOINCREMENT,
token_hash TEXT UNIQUE NOT NULL,
profile_public_id TEXT NOT NULL,
email TEXT NOT NULL,
expires_at DATETIME NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_profile ON customer_sessions(profile_public_id);

CREATE TABLE IF NOT EXISTS customer_carts(
id INTEGER PRIMARY KEY AUTOINCREMENT,
profile_public_id TEXT UNIQUE NOT NULL,
cart_json TEXT NOT NULL DEFAULT '[]',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(profile_public_id) REFERENCES customer_profiles(public_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_carts_profile ON customer_carts(profile_public_id);

CREATE TABLE IF NOT EXISTS order_claims(
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id INTEGER NOT NULL,
profile_public_id TEXT NOT NULL,
claimed_email TEXT NOT NULL,
claim_method TEXT NOT NULL DEFAULT 'email_otp',
claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_claims_order_profile ON order_claims(order_id, profile_public_id);

CREATE TABLE IF NOT EXISTS order_items(
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id INTEGER NOT NULL,
tour_slug TEXT NOT NULL,
tour_title_en TEXT,
tour_title_es TEXT,
service_date TEXT,
adults INTEGER NOT NULL DEFAULT 0,
children INTEGER NOT NULL DEFAULT 0,
add_ons_json TEXT,
subtotal INTEGER NOT NULL DEFAULT 0,
hotel TEXT,
pickup_time TEXT,
FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments(
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id INTEGER NOT NULL,
provider TEXT NOT NULL,
intent TEXT,
amount INTEGER NOT NULL DEFAULT 0,
subtotal REAL NOT NULL DEFAULT 0,
fee_percent REAL NOT NULL DEFAULT 0,
fee_amount REAL NOT NULL DEFAULT 0,
total_final REAL NOT NULL DEFAULT 0,
currency TEXT NOT NULL DEFAULT 'USD',
status TEXT NOT NULL DEFAULT 'created',
provider_status TEXT,
provider_event_id TEXT,
paypal_order_id TEXT,
paypal_authorization_id TEXT,
paypal_capture_id TEXT,
bank_reference TEXT,
seller_protection_status TEXT,
paid_at DATETIME,
metadata_json TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_authorization_id ON payments(paypal_authorization_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_capture_id ON payments(paypal_capture_id);

CREATE TABLE IF NOT EXISTS payment_webhook_inbox(
id INTEGER PRIMARY KEY AUTOINCREMENT,
provider TEXT NOT NULL,
payment_id INTEGER,
event_type TEXT NOT NULL,
provider_event_id TEXT NOT NULL,
payload TEXT NOT NULL,
verification_status TEXT NOT NULL DEFAULT 'pending',
processed_at DATETIME,
received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_event ON payment_webhook_inbox(provider, provider_event_id);

CREATE TABLE IF NOT EXISTS bank_transfer_submissions(
id INTEGER PRIMARY KEY AUTOINCREMENT,
payment_id INTEGER NOT NULL,
proof_path TEXT NOT NULL,
submitted_reference TEXT,
submitted_amount INTEGER,
match_score INTEGER NOT NULL DEFAULT 0,
review_status TEXT NOT NULL DEFAULT 'pending',
reviewed_by TEXT,
reviewed_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_submissions_payment_id ON bank_transfer_submissions(payment_id);

CREATE TABLE IF NOT EXISTS refunds(
id INTEGER PRIMARY KEY AUTOINCREMENT,
payment_id INTEGER NOT NULL,
provider TEXT NOT NULL,
amount INTEGER NOT NULL DEFAULT 0,
currency TEXT NOT NULL DEFAULT 'USD',
status TEXT NOT NULL DEFAULT 'pending',
provider_refund_id TEXT,
reason TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents(
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id INTEGER NOT NULL,
document_type TEXT NOT NULL,
storage_path TEXT NOT NULL,
visibility TEXT NOT NULL DEFAULT 'private',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);

CREATE TABLE IF NOT EXISTS audit_logs(
id INTEGER PRIMARY KEY AUTOINCREMENT,
actor_type TEXT NOT NULL,
actor_id TEXT,
action TEXT NOT NULL,
entity_type TEXT NOT NULL,
entity_id TEXT NOT NULL,
metadata TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
