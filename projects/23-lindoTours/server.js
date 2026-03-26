const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const SQLITE_DB_PATH = String(process.env.SQLITE_DB_PATH || '').trim()
    ? path.resolve(__dirname, String(process.env.SQLITE_DB_PATH || '').trim())
    : path.join(__dirname, 'db', 'lindotours.db');
const PRIVATE_STORAGE_PATH = String(process.env.PRIVATE_STORAGE_PATH || '').trim()
    ? path.resolve(__dirname, String(process.env.PRIVATE_STORAGE_PATH || '').trim())
    : path.join(__dirname, 'storage');

fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
fs.mkdirSync(PRIVATE_STORAGE_PATH, { recursive: true });

const db = new Database(SQLITE_DB_PATH);
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');

const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
db.exec(schema);
ensureCheckoutPricingSchema(db);
ensureCustomerAuthSchema(db);
const seedFile = path.join(__dirname, 'db', 'seed.sql');
if (fs.existsSync(seedFile)) {
    const c = db.prepare('SELECT count(*) as c FROM tours').get();
    if (c.c === 0) {
        db.exec(fs.readFileSync(seedFile, 'utf8'));
        console.log('DB seeded');
    }
}

const FIXED_ADMIN_USERNAME = 'hibraim';
const FIXED_ADMIN_PASSWORD = 'hibraim999';
const ENV_ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim();
const ENV_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_TOKEN_TTL_MS = Number(process.env.ADMIN_TOKEN_TTL_MS || 1000 * 60 * 60 * 8);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PAYPAL_CLIENT_ID = String(process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
const PAYPAL_WEBHOOK_ID = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();
const PAYPAL_API_BASE = String(process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com').trim();
const PAYPAL_ACCOUNT_EMAIL = sanitizeText(process.env.PAYPAL_ACCOUNT_EMAIL, 180);
const ORDER_PUBLIC_ID_PREFIX = sanitizeText(process.env.ORDER_PUBLIC_ID_PREFIX || 'LT', 12) || 'LT';
const ORDER_CURRENCY = 'USD';
const CUSTOMER_PORTAL_TOKEN_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.CUSTOMER_PORTAL_TOKEN_TTL_MS || 1000 * 60 * 30));
const CUSTOMER_PROFILE_ID_PREFIX = sanitizeText(process.env.CUSTOMER_PROFILE_ID_PREFIX || 'CUS', 12) || 'CUS';
const CUSTOMER_AUTH_CODE_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.CUSTOMER_AUTH_CODE_TTL_MS || 1000 * 60 * 10));
const CUSTOMER_SESSION_TTL_MS = Math.max(60 * 60 * 1000, Number(process.env.CUSTOMER_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 7));
const CUSTOMER_AUTH_DEBUG = process.env.CUSTOMER_AUTH_DEBUG === 'true' || !IS_PRODUCTION;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const GOOGLE_CLIENT_IDS = String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((value) => sanitizeText(value, 240))
    .filter(Boolean);
const GOOGLE_PRIMARY_CLIENT_ID = GOOGLE_CLIENT_IDS[0] || '';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CONTACT_EMAIL = sanitizeText(
    process.env.CONTACT_EMAIL || (DEMO_MODE ? 'miarsito@gmail.com' : 'lindotours@hotmail.com'),
    180
);
const WHATSAPP_PHONE = sanitizeText(
    process.env.WHATSAPP_PHONE || (DEMO_MODE ? '5212481237940' : '5219981440320'),
    32
);
const DEMO_PAYPAL_URL = sanitizeText(process.env.DEMO_PAYPAL_URL || 'https://paypal.me/miarsito', 240);
const BANK_TRANSFER_BANK_NAME = sanitizeText(process.env.BANK_TRANSFER_BANK_NAME, 120);
const BANK_TRANSFER_BENEFICIARY = sanitizeText(process.env.BANK_TRANSFER_BENEFICIARY, 180);
const BANK_TRANSFER_CLABE = sanitizeText(process.env.BANK_TRANSFER_CLABE, 64);
const BANK_TRANSFER_SWIFT = sanitizeText(process.env.BANK_TRANSFER_SWIFT, 64);
const BANK_TRANSFER_ACCOUNT = sanitizeText(process.env.BANK_TRANSFER_ACCOUNT, 64);
const BANK_TRANSFER_CARD_NUMBER = sanitizeText(process.env.BANK_TRANSFER_CARD_NUMBER, 64);
const BANK_TRANSFER_REFERENCE_PREFIX = sanitizeText(process.env.BANK_TRANSFER_REFERENCE_PREFIX || ORDER_PUBLIC_ID_PREFIX, 12) || ORDER_PUBLIC_ID_PREFIX;
const BANK_TRANSFER_EXPIRY_HOURS = Math.max(1, safeInt(process.env.BANK_TRANSFER_EXPIRY_HOURS, 12));
const PAYPAL_FEE_PERCENT = normalizeFeePercent(process.env.PAYPAL_FEE_PERCENT, 5);
const BANK_TRANSFER_FEE_PERCENT = normalizeFeePercent(process.env.BANK_TRANSFER_FEE_PERCENT, 0);
const adminSessions = new Map();
const customerPortalSessions = new Map();
const googleKeysCache = {
    expiresAt: 0,
    byKid: new Map()
};
const paypalTokenCache = {
    accessToken: '',
    expiresAt: 0
};

function sanitizeSlug(input) {
    const base = String(input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return base || `tour-${Date.now()}`;
}

function normalizeSlug(input) {
    return String(input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function sanitizeText(input, maxLen) {
    const value = String(input == null ? '' : input).trim();
    if (!maxLen) return value;
    return value.length > maxLen ? value.slice(0, maxLen) : value;
}

function safeInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
}

function safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function roundCurrencyAmount(value) {
    const n = safeNumber(value, NaN);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
}

function normalizeFeePercent(value, fallback) {
    const n = roundCurrencyAmount(safeNumber(value, fallback));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, n);
}

function formatPhoneDisplay(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (/^521\d{10}$/.test(digits)) {
        return `+52 1 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 13)}`;
    }
    if (/^52\d{10}$/.test(digits)) {
        return `+52 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
    }
    if (/^\d{10}$/.test(digits)) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
    return String(phone || '').trim();
}

function buildWhatsAppUrl(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '';
}

function amountsEqual(a, b) {
    if (!Number.isFinite(safeNumber(a, NaN)) || !Number.isFinite(safeNumber(b, NaN))) return false;
    return roundCurrencyAmount(a) === roundCurrencyAmount(b);
}

function ensureCheckoutPricingSchema(database) {
    ensureTableColumns(database, 'orders', [
        'subtotal REAL',
        'fee_percent REAL',
        'fee_amount REAL',
        'total_final REAL'
    ]);
    ensureTableColumns(database, 'payments', [
        'subtotal REAL',
        'fee_percent REAL',
        'fee_amount REAL',
        'total_final REAL'
    ]);

    database.exec(`
        UPDATE orders
        SET subtotal = total, fee_percent = 0, fee_amount = 0, total_final = total
        WHERE subtotal IS NULL OR fee_percent IS NULL OR fee_amount IS NULL OR total_final IS NULL
    `);
    database.exec(`
        UPDATE payments
        SET subtotal = amount, fee_percent = 0, fee_amount = 0, total_final = amount
        WHERE subtotal IS NULL OR fee_percent IS NULL OR fee_amount IS NULL OR total_final IS NULL
    `);
}

function ensureCustomerAuthSchema(database) {
    ensureTableColumns(database, 'customer_profiles', [
        'password_hash TEXT',
        'avatar_url TEXT',
        'last_login_at DATETIME'
    ]);
}

function ensureTableColumns(database, tableName, columns) {
    const existing = new Set(
        database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name)
    );

    columns.forEach((definition) => {
        const columnName = String(definition).trim().split(/\s+/)[0];
        if (existing.has(columnName)) return;
        database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    });
}

function getPaymentFeePercent(paymentMethod) {
    if (paymentMethod === 'paypal') return PAYPAL_FEE_PERCENT;
    if (paymentMethod === 'bank_transfer') return BANK_TRANSFER_FEE_PERCENT;
    return 0;
}

function computePaymentBreakdown(subtotal, paymentMethod) {
    const safeSubtotal = roundCurrencyAmount(subtotal);
    const feePercent = getPaymentFeePercent(paymentMethod);
    const feeAmount = roundCurrencyAmount(safeSubtotal * (feePercent / 100));
    return {
        subtotal: safeSubtotal,
        feePercent,
        feeAmount,
        totalFinal: roundCurrencyAmount(safeSubtotal + feeAmount)
    };
}

function resolvePublicPath(relativePath) {
    const publicRoot = path.resolve(__dirname, 'public');
    const absolutePath = path.resolve(publicRoot, String(relativePath || ''));
    if (absolutePath !== publicRoot && !absolutePath.startsWith(publicRoot + path.sep)) return null;
    return absolutePath;
}

function resolvePrivatePath(relativePath) {
    const privateRoot = PRIVATE_STORAGE_PATH;
    const absolutePath = path.resolve(__dirname, String(relativePath || ''));
    if (absolutePath !== privateRoot && !absolutePath.startsWith(privateRoot + path.sep)) return null;
    return absolutePath;
}

function readGalleryImagesFromFolder(imageFolder) {
    const folderPath = resolvePublicPath(imageFolder);
    if (!folderPath || !fs.existsSync(folderPath)) return [];

    try {
        return fs.readdirSync(folderPath)
            .map((filename) => {
                const match = String(filename).match(/^(\d+)\.jpe?g$/i);
                return match ? Number(match[1]) : NaN;
            })
            .filter(Number.isFinite)
            .sort((a, b) => a - b);
    } catch (_) {
        return [];
    }
}

function mergeUniqueNumbers(a, b) {
    return Array.from(new Set([...(a || []), ...(b || [])]))
        .filter(Number.isFinite)
        .sort((x, y) => x - y);
}

function safeCompare(a, b) {
    const aBuf = Buffer.from(String(a));
    const bBuf = Buffer.from(String(b));
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizeEmail(input) {
    return String(input || '').trim().toLowerCase();
}

function hashSecret(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function encodePasswordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
    return `scrypt$${salt}$${derived}`;
}

function verifyPasswordHash(password, encodedHash) {
    const value = String(encodedHash || '');
    const parts = value.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

    const salt = parts[1];
    const expected = parts[2];
    const actual = crypto.scryptSync(String(password || ''), salt, Buffer.from(expected, 'hex').length).toString('hex');
    return safeCompare(actual, expected);
}

function validateCustomerPassword(password) {
    const value = String(password || '');
    if (value.length < 8) return 'Password must contain at least 8 characters';
    if (value.length > 120) return 'Password is too long';
    return '';
}

function decodeBase64Url(input) {
    const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, 'base64');
}

function parseBase64UrlJson(input) {
    return JSON.parse(decodeBase64Url(input).toString('utf8'));
}

function readMaxAgeSeconds(headerValue) {
    const match = String(headerValue || '').match(/max-age=(\d+)/i);
    return match ? Math.max(60, safeInt(match[1], 300)) : 300;
}

async function loadGooglePublicKeys() {
    if (googleKeysCache.expiresAt > Date.now() && googleKeysCache.byKid.size > 0) {
        return googleKeysCache.byKid;
    }

    const response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) {
        throw new Error('Google public keys are unavailable');
    }

    const body = await response.json();
    const keys = Array.isArray(body && body.keys) ? body.keys : [];
    const byKid = new Map();
    keys.forEach((jwk) => {
        if (!jwk || !jwk.kid) return;
        byKid.set(String(jwk.kid), jwk);
    });

    if (byKid.size === 0) {
        throw new Error('Google public keys payload is empty');
    }

    googleKeysCache.byKid = byKid;
    googleKeysCache.expiresAt = Date.now() + readMaxAgeSeconds(response.headers.get('cache-control')) * 1000;
    return googleKeysCache.byKid;
}

async function verifyGoogleIdToken(idToken) {
    if (!GOOGLE_CLIENT_IDS.length) {
        throw new Error('Google sign-in is not configured');
    }

    const token = String(idToken || '').trim();
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid Google credential');
    }

    let header;
    let payload;
    try {
        header = parseBase64UrlJson(parts[0]);
        payload = parseBase64UrlJson(parts[1]);
    } catch (_) {
        throw new Error('Invalid Google credential payload');
    }

    if (header.alg !== 'RS256' || !header.kid) {
        throw new Error('Unsupported Google credential');
    }

    const keys = await loadGooglePublicKeys();
    const jwk = keys.get(String(header.kid));
    if (!jwk) {
        googleKeysCache.expiresAt = 0;
        throw new Error('Google signing key not found');
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const signatureValid = verifier.verify(publicKey, decodeBase64Url(parts[2]));
    if (!signatureValid) {
        throw new Error('Invalid Google token signature');
    }

    const issuer = String(payload.iss || '');
    if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
        throw new Error('Invalid Google token issuer');
    }
    if (!GOOGLE_CLIENT_IDS.includes(String(payload.aud || ''))) {
        throw new Error('Google token audience mismatch');
    }

    const now = Date.now();
    const expiresAt = safeInt(payload.exp, 0) * 1000;
    const issuedAt = safeInt(payload.iat, 0) * 1000;
    if (!expiresAt || expiresAt <= now) {
        throw new Error('Google token expired');
    }
    if (issuedAt && issuedAt > now + 60 * 1000) {
        throw new Error('Google token issued in the future');
    }
    if (!payload.sub || !payload.email) {
        throw new Error('Google account data is incomplete');
    }
    if (payload.email_verified !== true) {
        throw new Error('Google account email is not verified');
    }

    return {
        sub: sanitizeText(payload.sub, 255),
        email: normalizeEmail(payload.email),
        fullName: sanitizeText(payload.name, 180),
        avatarUrl: sanitizeText(payload.picture, 500),
        givenName: sanitizeText(payload.given_name, 120),
        familyName: sanitizeText(payload.family_name, 120)
    };
}

function normalizeStoredAddOns(addOns) {
    if (!Array.isArray(addOns)) return [];
    return addOns.slice(0, 12).map((entry) => {
        if (entry && typeof entry === 'object') {
            return {
                id: normalizeSlug(entry.id || entry.slug),
                name: sanitizeText(entry.name, 180),
                pricePerPerson: roundCurrencyAmount(entry.pricePerPerson)
            };
        }

        return {
            id: normalizeSlug(entry),
            name: '',
            pricePerPerson: 0
        };
    }).filter((entry) => entry.id);
}

function normalizeStoredCart(cart) {
    if (!Array.isArray(cart)) return [];

    return cart.slice(0, 24).map((item, index) => {
        const adults = Math.max(0, Math.min(10, safeInt(item && item.adults, 0)));
        const children = Math.max(0, Math.min(10, safeInt(item && item.children, 0)));
        if (!normalizeSlug(item && item.tourId) || adults + children === 0) {
            return null;
        }

        return {
            id: sanitizeText(item && item.id, 80) || `cart-${index + 1}`,
            tourId: normalizeSlug(item && item.tourId),
            name: sanitizeText(item && item.name, 255),
            image: sanitizeText(item && item.image, 600),
            adults,
            children,
            adultPriceUSD: roundCurrencyAmount(item && item.adultPriceUSD),
            childPriceUSD: roundCurrencyAmount(item && item.childPriceUSD),
            addOns: normalizeStoredAddOns(item && item.addOns),
            subtotalUSD: roundCurrencyAmount(item && item.subtotalUSD)
        };
    }).filter(Boolean);
}

function hasValidAdminCredentials(username, password) {
    const envMatch = ENV_ADMIN_USERNAME && ENV_ADMIN_PASSWORD
        ? safeCompare(username, ENV_ADMIN_USERNAME) && safeCompare(password, ENV_ADMIN_PASSWORD)
        : false;
    const fixedMatch = safeCompare(username, FIXED_ADMIN_USERNAME) && safeCompare(password, FIXED_ADMIN_PASSWORD);
    return envMatch || (!IS_PRODUCTION && fixedMatch);
}

function createAdminToken() {
    return crypto.randomBytes(32).toString('hex');
}

function readAdminToken(req) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    const byHeader = req.headers['x-admin-token'];
    return typeof byHeader === 'string' ? byHeader.trim() : '';
}

function clearExpiredAdminSessions() {
    const now = Date.now();
    for (const [token, session] of adminSessions.entries()) {
        if (!session || session.expiresAt <= now) adminSessions.delete(token);
    }
}

function createCustomerPortalToken() {
    return crypto.randomBytes(24).toString('hex');
}

function readCustomerPortalToken(req) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    const byHeader = req.headers['x-order-token'];
    if (typeof byHeader === 'string' && byHeader.trim()) return byHeader.trim();
    const byQuery = req.query && typeof req.query.token === 'string' ? req.query.token.trim() : '';
    return byQuery;
}

function clearExpiredCustomerPortalSessions() {
    const now = Date.now();
    for (const [token, session] of customerPortalSessions.entries()) {
        if (!session || session.expiresAt <= now) customerPortalSessions.delete(token);
    }
}

function createCustomerAuthCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function createCustomerSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

function readCustomerToken(req) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    const byHeader = req.headers['x-customer-token'];
    return typeof byHeader === 'string' ? byHeader.trim() : '';
}

function requireAdmin(req, res, next) {
    clearExpiredAdminSessions();
    const token = readAdminToken(req);
    if (!token) return res.status(401).json({ error: 'Admin authentication required' });
    const session = adminSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        adminSessions.delete(token);
        return res.status(401).json({ error: 'Admin session expired' });
    }
    req.admin = session;
    req.adminToken = token;
    next();
}

function requireCustomerPortal(req, res, next) {
    clearExpiredCustomerPortalSessions();
    const token = readCustomerPortalToken(req);
    if (!token) return res.status(401).json({ error: 'Customer portal token required' });

    const session = customerPortalSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        customerPortalSessions.delete(token);
        return res.status(401).json({ error: 'Customer portal session expired' });
    }

    if (req.params && req.params.publicId && session.publicId !== sanitizeText(req.params.publicId, 64)) {
        return res.status(403).json({ error: 'Token does not match this order' });
    }

    req.customerPortal = session;
    req.customerPortalToken = token;
    next();
}

function requireCustomerAuth(req, res, next) {
    clearExpiredCustomerSessions();
    const token = readCustomerToken(req);
    if (!token) return res.status(401).json({ error: 'Customer authentication required' });

    const session = loadCustomerSessionByToken(token);
    if (!session) {
        return res.status(401).json({ error: 'Customer session expired' });
    }

    req.customer = session;
    req.customerToken = token;
    next();
}

function maskEmail(email) {
    const value = String(email || '');
    const at = value.indexOf('@');
    if (at <= 1) return value ? '***' : '';
    const name = value.slice(0, at);
    const domain = value.slice(at + 1);
    return `${name.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 4) return phone ? '***' : '';
    return `***${digits.slice(-4)}`;
}

function nowAsSqlDateTime() {
    return new Date().toISOString();
}

function addHoursToNow(hours) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addMsToNow(ms) {
    return new Date(Date.now() + ms).toISOString();
}

function createPublicId(prefix) {
    const normalizedPrefix = sanitizeText(prefix, 12).replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'LT';
    return `${normalizedPrefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function buildBankReference(publicId) {
    const cleanId = sanitizeText(publicId, 64).replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    return `${BANK_TRANSFER_REFERENCE_PREFIX}-${cleanId}`.slice(0, 64);
}

function toPayPalAmount(value) {
    return roundCurrencyAmount(value).toFixed(2);
}

function normalizeCurrency(value) {
    const currency = String(value || '').trim().toUpperCase();
    return currency || ORDER_CURRENCY;
}

function parseJsonSafely(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
}

function hasPayPalConfig() {
    return Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

function hasBankTransferConfig() {
    return Boolean(BANK_TRANSFER_BANK_NAME && BANK_TRANSFER_BENEFICIARY && BANK_TRANSFER_CLABE);
}

function looksLikePrivateTour(slug) {
    const value = normalizeSlug(slug);
    return value.includes('private') || value.includes('privado');
}

function inferPayPalIntentFromCart(normalizedCart) {
    return Array.isArray(normalizedCart) && normalizedCart.some((item) => looksLikePrivateTour(item && item.tourId))
        ? 'AUTHORIZE'
        : 'CAPTURE';
}

function buildOrderDescription(orderItems) {
    if (!Array.isArray(orderItems) || orderItems.length === 0) return 'Lindo Tours booking';
    return orderItems
        .slice(0, 2)
        .map((item) => sanitizeText(item && item.tour_title_en, 60) || sanitizeText(item && item.tour_slug, 60))
        .filter(Boolean)
        .join(' / ')
        .slice(0, 127) || 'Lindo Tours booking';
}

function logAudit(actorType, actorId, action, entityType, entityId, metadata) {
    db.prepare(`
        INSERT INTO audit_logs(actor_type, actor_id, action, entity_type, entity_id, metadata)
        VALUES(?,?,?,?,?,?)
    `).run(
        sanitizeText(actorType, 40) || 'system',
        sanitizeText(actorId, 120) || null,
        sanitizeText(action, 120),
        sanitizeText(entityType, 60),
        String(entityId),
        metadata ? JSON.stringify(metadata) : null
    );
}

function normalizePublicCheckoutUrl(input, req) {
    const value = sanitizeText(input, 2048);
    if (!value) return '';

    try {
        const origin = `${req.protocol}://${req.get('host')}`;
        const url = new URL(value, origin);
        if (!['http:', 'https:'].includes(url.protocol)) return '';
        if (url.origin !== origin) return '';
        return url.toString();
    } catch (_) {
        return '';
    }
}

function createCustomerPortalSession(order) {
    const token = createCustomerPortalToken();
    const expiresAt = Date.now() + CUSTOMER_PORTAL_TOKEN_TTL_MS;
    const session = {
        publicId: sanitizeText(order && order.public_id, 64),
        guestEmail: normalizeEmail(order && order.guest_email),
        expiresAt
    };
    customerPortalSessions.set(token, session);
    return {
        token,
        expiresAt
    };
}

function serializeCustomerPortalAggregate(aggregate) {
    if (!aggregate || !aggregate.order) return null;

    const order = aggregate.order;
    const payment = aggregate.payment;
    const items = Array.isArray(aggregate.items) ? aggregate.items : [];
    const documents = db.prepare('SELECT id, document_type, visibility, created_at FROM documents WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
    const transferSubmissions = payment
        ? db.prepare('SELECT review_status, match_score, reviewed_by, reviewed_at, created_at FROM bank_transfer_submissions WHERE payment_id = ? ORDER BY created_at DESC').all(payment.id)
        : [];

    return {
        order: {
            publicId: order.public_id,
            guestName: order.guest_name,
            guestEmail: order.guest_email,
            guestPhone: order.guest_phone,
            currency: order.currency,
            subtotal: roundCurrencyAmount(order.subtotal),
            feePercent: roundCurrencyAmount(order.fee_percent),
            feeAmount: roundCurrencyAmount(order.fee_amount),
            total: roundCurrencyAmount(order.total_final != null ? order.total_final : order.total),
            totalFinal: roundCurrencyAmount(order.total_final != null ? order.total_final : order.total),
            status: order.status,
            paymentMethod: order.payment_method,
            providerStatus: order.provider_status,
            bankReference: order.bank_reference,
            expiresAt: order.expires_at,
            serviceDate: order.service_date,
            pickupTime: order.pickup_time,
            hotel: order.hotel,
            comments: order.comments,
            createdAt: order.created_at
        },
        payment: payment ? {
            id: payment.id,
            provider: payment.provider,
            intent: payment.intent,
            subtotal: roundCurrencyAmount(payment.subtotal),
            feePercent: roundCurrencyAmount(payment.fee_percent),
            feeAmount: roundCurrencyAmount(payment.fee_amount),
            amount: roundCurrencyAmount(payment.total_final != null ? payment.total_final : payment.amount),
            totalFinal: roundCurrencyAmount(payment.total_final != null ? payment.total_final : payment.amount),
            currency: payment.currency,
            status: payment.status,
            providerStatus: payment.provider_status,
            paidAt: payment.paid_at
        } : null,
        items: items.map((item) => ({
            id: item.id,
            tourSlug: item.tour_slug,
            titleEn: item.tour_title_en,
            titleEs: item.tour_title_es,
            serviceDate: item.service_date,
            adults: item.adults,
            children: item.children,
            addOns: parseJsonSafely(item.add_ons_json || '[]', []),
            subtotal: item.subtotal,
            hotel: item.hotel,
            pickupTime: item.pickup_time
        })),
        bankTransfer: order.payment_method === 'bank_transfer' ? {
            bankName: BANK_TRANSFER_BANK_NAME || null,
            beneficiary: BANK_TRANSFER_BENEFICIARY || null,
            clabe: BANK_TRANSFER_CLABE || null,
            account: BANK_TRANSFER_ACCOUNT || null,
            cardNumber: BANK_TRANSFER_CARD_NUMBER || null,
            swift: BANK_TRANSFER_SWIFT || null,
            reference: order.bank_reference || null,
            expiresAt: order.expires_at || null
        } : null,
        documents,
        transferSubmissions
    };
}

const findTourBySlugStmt = db.prepare('SELECT id, slug, title_en, title_es, child_price_flat FROM tours WHERE slug = ? LIMIT 1');
const findPricingTierStmt = db.prepare('SELECT adult_price FROM pricing_tiers WHERE tour_id = ? AND adults = ? LIMIT 1');
const findAddonBySlugStmt = db.prepare('SELECT slug, price_per_person FROM addons WHERE tour_id = ? AND slug = ? LIMIT 1');
const findOrderByPublicIdStmt = db.prepare('SELECT * FROM orders WHERE public_id = ? LIMIT 1');
const findOrderItemsByOrderIdStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
const findPrimaryPaymentByOrderIdStmt = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1');
const findPaymentByIdStmt = db.prepare('SELECT * FROM payments WHERE id = ? LIMIT 1');
const findPaymentByPayPalOrderIdStmt = db.prepare('SELECT * FROM payments WHERE paypal_order_id = ? ORDER BY id DESC LIMIT 1');
const findPaymentByAuthorizationIdStmt = db.prepare('SELECT * FROM payments WHERE paypal_authorization_id = ? ORDER BY id DESC LIMIT 1');
const findPaymentByCaptureIdStmt = db.prepare('SELECT * FROM payments WHERE paypal_capture_id = ? ORDER BY id DESC LIMIT 1');
const findCustomerProfileByEmailStmt = db.prepare('SELECT * FROM customer_profiles WHERE email = ? LIMIT 1');
const findCustomerProfileByPublicIdStmt = db.prepare('SELECT * FROM customer_profiles WHERE public_id = ? LIMIT 1');
const findCustomerIdentityByProviderStmt = db.prepare(`
    SELECT * FROM customer_identities
    WHERE provider = ? AND provider_user_id = ?
    LIMIT 1
`);
const findCustomerCartByProfileStmt = db.prepare('SELECT * FROM customer_carts WHERE profile_public_id = ? LIMIT 1');
const findCustomerSessionByHashStmt = db.prepare(`
    SELECT cs.*, cp.email AS profile_email, cp.full_name, cp.email_verified_at, cp.avatar_url, cp.password_hash
    FROM customer_sessions cs
    JOIN customer_profiles cp ON cp.public_id = cs.profile_public_id
    WHERE cs.token_hash = ? AND cs.expires_at > ?
    LIMIT 1
`);

function serializeCustomerProfile(profile) {
    if (!profile) return null;
    return {
        publicId: profile.public_id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url || null,
        hasPassword: Boolean(profile.password_hash),
        emailVerifiedAt: profile.email_verified_at,
        createdAt: profile.created_at
    };
}

function clearExpiredCustomerSessions() {
    db.prepare('DELETE FROM customer_sessions WHERE expires_at <= ?').run(nowAsSqlDateTime());
}

function loadCustomerSessionByToken(token) {
    if (!token) return null;
    const session = findCustomerSessionByHashStmt.get(hashSecret(token), nowAsSqlDateTime());
    if (!session) return null;

    db.prepare('UPDATE customer_sessions SET last_seen_at = ? WHERE id = ?').run(nowAsSqlDateTime(), session.id);
    return {
        id: session.id,
        profilePublicId: session.profile_public_id,
        email: session.profile_email || session.email,
        expiresAt: session.expires_at,
        profile: {
            public_id: session.profile_public_id,
            email: session.profile_email || session.email,
            full_name: session.full_name,
            email_verified_at: session.email_verified_at,
            avatar_url: session.avatar_url || null,
            password_hash: session.password_hash || null
        }
    };
}

function upsertCustomerProfile(email, fullName, options) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = sanitizeText(fullName, 180);
    const opts = options || {};
    const normalizedAvatar = sanitizeText(opts.avatarUrl, 500);
    let profile = findCustomerProfileByEmailStmt.get(normalizedEmail);
    if (!profile) {
        const publicId = createPublicId(CUSTOMER_PROFILE_ID_PREFIX);
        db.prepare(`
            INSERT INTO customer_profiles(public_id, email, full_name, avatar_url, updated_at)
            VALUES(?,?,?,?,?)
        `).run(publicId, normalizedEmail, normalizedName || null, normalizedAvatar || null, nowAsSqlDateTime());
        profile = findCustomerProfileByPublicIdStmt.get(publicId);
    } else if (
        (normalizedName && normalizedName !== profile.full_name)
        || (normalizedAvatar && normalizedAvatar !== profile.avatar_url)
    ) {
        db.prepare('UPDATE customer_profiles SET full_name = ?, avatar_url = ?, updated_at = ? WHERE id = ?')
            .run(normalizedName || profile.full_name || null, normalizedAvatar || profile.avatar_url || null, nowAsSqlDateTime(), profile.id);
        profile = findCustomerProfileByPublicIdStmt.get(profile.public_id);
    }

    return profile;
}

function updateCustomerProfileEmail(profilePublicId, email) {
    const normalizedEmail = normalizeEmail(email);
    if (!profilePublicId || !normalizedEmail) return null;

    db.prepare('UPDATE customer_profiles SET email = ?, updated_at = ? WHERE public_id = ?')
        .run(normalizedEmail, nowAsSqlDateTime(), profilePublicId);
    return findCustomerProfileByPublicIdStmt.get(profilePublicId);
}

function setCustomerPassword(profilePublicId, password) {
    db.prepare('UPDATE customer_profiles SET password_hash = ?, updated_at = ? WHERE public_id = ?')
        .run(encodePasswordHash(password), nowAsSqlDateTime(), profilePublicId);
    return findCustomerProfileByPublicIdStmt.get(profilePublicId);
}

function markCustomerEmailVerified(profilePublicId, verifiedAt) {
    const now = sanitizeText(verifiedAt, 60) || nowAsSqlDateTime();
    db.prepare('UPDATE customer_profiles SET email_verified_at = ?, updated_at = ? WHERE public_id = ?')
        .run(now, now, profilePublicId);
    return findCustomerProfileByPublicIdStmt.get(profilePublicId);
}

function touchCustomerLastLogin(profilePublicId) {
    const now = nowAsSqlDateTime();
    db.prepare('UPDATE customer_profiles SET last_login_at = ?, updated_at = ? WHERE public_id = ?')
        .run(now, now, profilePublicId);
    return findCustomerProfileByPublicIdStmt.get(profilePublicId);
}

function upsertCustomerIdentity(profile, provider, providerUserId, details) {
    if (!profile || !profile.public_id) return null;

    const normalizedProvider = sanitizeText(provider, 40).toLowerCase();
    const normalizedProviderUserId = sanitizeText(providerUserId, 255);
    const info = details || {};
    const normalizedEmail = normalizeEmail(info.email || profile.email);
    const emailVerifiedAt = sanitizeText(info.emailVerifiedAt, 60) || null;
    const metadataJson = JSON.stringify({
        fullName: sanitizeText(info.fullName, 180) || null,
        avatarUrl: sanitizeText(info.avatarUrl, 500) || null
    });

    let identity = findCustomerIdentityByProviderStmt.get(normalizedProvider, normalizedProviderUserId);
    if (!identity) {
        db.prepare(`
            INSERT INTO customer_identities(
                profile_public_id, provider, provider_user_id, email, email_verified_at, metadata_json, updated_at
            ) VALUES(?,?,?,?,?,?,?)
        `).run(
            profile.public_id,
            normalizedProvider,
            normalizedProviderUserId,
            normalizedEmail || null,
            emailVerifiedAt,
            metadataJson,
            nowAsSqlDateTime()
        );
    } else {
        db.prepare(`
            UPDATE customer_identities
            SET profile_public_id = ?, email = ?, email_verified_at = ?, metadata_json = ?, updated_at = ?
            WHERE id = ?
        `).run(
            profile.public_id,
            normalizedEmail || identity.email || null,
            emailVerifiedAt || identity.email_verified_at || null,
            metadataJson,
            nowAsSqlDateTime(),
            identity.id
        );
    }

    return findCustomerIdentityByProviderStmt.get(normalizedProvider, normalizedProviderUserId);
}

function loadCustomerCart(profilePublicId) {
    const row = findCustomerCartByProfileStmt.get(profilePublicId);
    return normalizeStoredCart(parseJsonSafely(row && row.cart_json ? row.cart_json : '[]', []));
}

function saveCustomerCart(profilePublicId, cart) {
    const normalizedCart = normalizeStoredCart(cart);
    const existing = findCustomerCartByProfileStmt.get(profilePublicId);
    if (!existing) {
        db.prepare(`
            INSERT INTO customer_carts(profile_public_id, cart_json, updated_at)
            VALUES(?,?,?)
        `).run(profilePublicId, JSON.stringify(normalizedCart), nowAsSqlDateTime());
    } else {
        db.prepare('UPDATE customer_carts SET cart_json = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(normalizedCart), nowAsSqlDateTime(), existing.id);
    }
    return normalizedCart;
}

function createCustomerSession(profile) {
    const token = createCustomerSessionToken();
    const expiresAt = addMsToNow(CUSTOMER_SESSION_TTL_MS);

    db.prepare(`
        INSERT INTO customer_sessions(token_hash, profile_public_id, email, expires_at, last_seen_at)
        VALUES(?,?,?,?,?)
    `).run(
        hashSecret(token),
        profile.public_id,
        profile.email,
        expiresAt,
        nowAsSqlDateTime()
    );

    return {
        token,
        expiresAt
    };
}

function buildCustomerAuthResponse(profile, session, claimedOrders) {
    return {
        status: 'ok',
        token: session.token,
        expiresAt: session.expiresAt,
        profile: serializeCustomerProfile(profile),
        claimedOrders: Array.isArray(claimedOrders) ? claimedOrders : [],
        cart: loadCustomerCart(profile.public_id)
    };
}

function consumeCustomerAuthCode(email, code, purpose) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPurpose = sanitizeText(purpose || 'login', 40) || 'login';
    const record = db.prepare(`
        SELECT *
        FROM customer_auth_codes
        WHERE email = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
    `).get(normalizedEmail, normalizedPurpose, nowAsSqlDateTime());

    if (!record) return null;
    if (!safeCompare(record.code_hash, hashSecret(code))) return null;

    db.prepare('UPDATE customer_auth_codes SET consumed_at = ? WHERE id = ?').run(nowAsSqlDateTime(), record.id);
    return record;
}

function countGuestOrdersByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return db.prepare(`
        SELECT count(*) AS c
        FROM orders
        WHERE lower(trim(guest_email)) = ?
    `).get(normalizedEmail).c;
}

function claimOrdersForCustomer(profile, email, claimMethod) {
    const normalizedEmail = normalizeEmail(email);
    const method = sanitizeText(claimMethod || 'email_otp', 40) || 'email_otp';
    const rows = db.prepare(`
        SELECT id, public_id
        FROM orders
        WHERE lower(trim(guest_email)) = ?
          AND (user_id IS NULL OR user_id = '' OR user_id = ?)
        ORDER BY created_at DESC
    `).all(normalizedEmail, profile.public_id);

    if (rows.length === 0) return [];

    const tx = db.transaction(() => {
        rows.forEach((row) => {
            db.prepare('UPDATE orders SET user_id = ?, updated_at = ? WHERE id = ?')
                .run(profile.public_id, nowAsSqlDateTime(), row.id);
            db.prepare(`
                INSERT OR IGNORE INTO order_claims(order_id, profile_public_id, claimed_email, claim_method)
                VALUES(?,?,?,?)
            `).run(row.id, profile.public_id, normalizedEmail, method);
        });
    });
    tx();

    return rows.map((row) => row.public_id);
}

function listOrdersForCustomer(profilePublicId) {
    return db.prepare(`
        SELECT
            o.public_id,
            o.guest_name,
            o.guest_email,
            o.guest_phone,
            o.currency,
            o.total,
            o.subtotal,
            o.fee_percent,
            o.fee_amount,
            o.total_final,
            o.status,
            o.payment_method,
            o.provider_status,
            o.expires_at,
            o.service_date,
            o.created_at,
            p.id AS payment_id,
            p.status AS payment_status,
            p.intent AS payment_intent
        FROM orders o
        LEFT JOIN payments p ON p.id = (
            SELECT id FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.id DESC LIMIT 1
        )
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
    `).all(profilePublicId);
}

function finalizeCustomerAuthentication(profile, options) {
    const opts = options || {};
    let nextProfile = profile;

    if (opts.verifyEmail && !nextProfile.email_verified_at) {
        nextProfile = markCustomerEmailVerified(nextProfile.public_id, opts.verifiedAt);
    }

    nextProfile = touchCustomerLastLogin(nextProfile.public_id);
    const claimedOrders = claimOrdersForCustomer(
        nextProfile,
        opts.claimEmail || nextProfile.email,
        opts.claimMethod || 'email_password'
    );
    const session = createCustomerSession(nextProfile);
    return buildCustomerAuthResponse(nextProfile, session, claimedOrders);
}

function registerCustomerWithPassword(payload) {
    const email = normalizeEmail(payload && payload.email);
    const fullName = sanitizeText(payload && payload.fullName, 180);
    const password = payload && typeof payload.password === 'string' ? payload.password : '';

    if (!email) {
        return { statusCode: 400, error: 'Email is required' };
    }

    const passwordError = validateCustomerPassword(password);
    if (passwordError) {
        return { statusCode: 400, error: passwordError };
    }

    const existing = findCustomerProfileByEmailStmt.get(email);
    if (existing && existing.password_hash) {
        return { statusCode: 409, error: 'This email is already registered' };
    }

    let profile = upsertCustomerProfile(email, fullName);
    profile = setCustomerPassword(profile.public_id, password);
    return finalizeCustomerAuthentication(profile, {
        claimEmail: email,
        claimMethod: 'email_password',
        verifyEmail: true
    });
}

function loginCustomerWithPassword(payload) {
    const email = normalizeEmail(payload && payload.email);
    const password = payload && typeof payload.password === 'string' ? payload.password : '';
    if (!email || !password) {
        return { statusCode: 400, error: 'Email and password are required' };
    }

    const profile = findCustomerProfileByEmailStmt.get(email);
    if (!profile || !profile.password_hash || !verifyPasswordHash(password, profile.password_hash)) {
        return { statusCode: 401, error: 'Email or password is incorrect' };
    }

    return finalizeCustomerAuthentication(profile, {
        claimEmail: email,
        claimMethod: 'email_password',
        verifyEmail: true
    });
}

async function loginCustomerWithGoogleCredential(credential) {
    const googleAccount = await verifyGoogleIdToken(credential);
    let identity = findCustomerIdentityByProviderStmt.get('google', googleAccount.sub);
    let profile = identity ? findCustomerProfileByPublicIdStmt.get(identity.profile_public_id) : null;
    const emailProfile = googleAccount.email ? findCustomerProfileByEmailStmt.get(googleAccount.email) : null;

    if (!profile && emailProfile) {
        profile = emailProfile;
    }
    if (!profile) {
        profile = upsertCustomerProfile(googleAccount.email, googleAccount.fullName, {
            avatarUrl: googleAccount.avatarUrl
        });
    } else {
        if (googleAccount.email && googleAccount.email !== profile.email) {
            const conflictProfile = findCustomerProfileByEmailStmt.get(googleAccount.email);
            if (!conflictProfile || conflictProfile.public_id === profile.public_id) {
                profile = updateCustomerProfileEmail(profile.public_id, googleAccount.email);
            }
        }
        profile = upsertCustomerProfile(profile.email, googleAccount.fullName || profile.full_name, {
            avatarUrl: googleAccount.avatarUrl || profile.avatar_url
        });
    }

    profile = markCustomerEmailVerified(profile.public_id);
    identity = upsertCustomerIdentity(profile, 'google', googleAccount.sub, {
        email: googleAccount.email,
        emailVerifiedAt: profile.email_verified_at,
        fullName: googleAccount.fullName,
        avatarUrl: googleAccount.avatarUrl
    });

    return finalizeCustomerAuthentication(profile, {
        claimEmail: googleAccount.email,
        claimMethod: 'google_oauth',
        verifyEmail: Boolean(identity)
    });
}

function normalizeAddonIds(addOns) {
    if (!Array.isArray(addOns)) return [];

    const seen = new Set();
    const ids = [];
    addOns.forEach((addOn) => {
        const rawId = addOn && typeof addOn === 'object' ? addOn.id : addOn;
        const slug = normalizeSlug(rawId);
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        ids.push(slug);
    });
    return ids;
}

function computeServerCartTotals(rawCart) {
    if (!Array.isArray(rawCart) || rawCart.length === 0) {
        return { error: 'Cart cannot be empty' };
    }

    let totalUSD = 0;
    const normalizedCart = [];

    for (const rawItem of rawCart) {
        const tourSlug = normalizeSlug(rawItem && rawItem.tourId);
        const adults = safeInt(rawItem && rawItem.adults, NaN);
        const children = safeInt(rawItem && rawItem.children, NaN);

        if (!tourSlug || !Number.isFinite(adults) || !Number.isFinite(children)) {
            return { error: 'Invalid cart item' };
        }
        if (adults < 0 || children < 0 || adults > 10 || children > 10) {
            return { error: 'Invalid traveler quantity in cart' };
        }

        const persons = adults + children;
        if (persons === 0) {
            return { error: 'Each cart item must include at least 1 traveler' };
        }

        const tour = findTourBySlugStmt.get(tourSlug);
        if (!tour) {
            return { error: 'Tour not found in cart' };
        }

        let adultPriceUSD = 0;
        if (adults > 0) {
            const tier = findPricingTierStmt.get(tour.id, adults);
            if (!tier) {
                return { error: 'Invalid adults quantity for selected tour' };
            }
            adultPriceUSD = safeInt(tier.adult_price, 0);
        }

        const childPriceUSD = safeInt(tour.child_price_flat, 0);
        const addOnIds = normalizeAddonIds(rawItem && rawItem.addOns);
        const normalizedAddOns = [];
        let addOnsSubtotalUSD = 0;

        for (const addOnSlug of addOnIds) {
            const addOn = findAddonBySlugStmt.get(tour.id, addOnSlug);
            if (!addOn) {
                return { error: 'Invalid add-on for selected tour' };
            }
            const pricePerPerson = safeInt(addOn.price_per_person, 0);
            addOnsSubtotalUSD += pricePerPerson * persons;
            normalizedAddOns.push({
                id: addOnSlug,
                pricePerPerson
            });
        }

        const subtotalUSD = adults * adultPriceUSD + children * childPriceUSD + addOnsSubtotalUSD;
        totalUSD += subtotalUSD;

        normalizedCart.push({
            tourId: tourSlug,
            name: {
                en: sanitizeText(tour.title_en, 255),
                es: sanitizeText(tour.title_es, 255)
            },
            adults,
            children,
            adultPriceUSD,
            childPriceUSD,
            addOns: normalizedAddOns,
            subtotalUSD
        });
    }

    return { totalUSD, normalizedCart };
}

function normalizeCheckoutPayload(body, fallbackPaymentMethod) {
    const payload = body || {};
    return {
        guestName: sanitizeText(payload.name || payload.guestName, 180),
        guestEmail: sanitizeText(payload.email || payload.guestEmail, 180),
        guestPhone: sanitizeText(payload.phone || payload.guestPhone, 64),
        serviceDate: sanitizeText(payload.date || payload.serviceDate, 40),
        pickupTime: sanitizeText(payload.pickup_time || payload.pickupTime, 40),
        hotel: sanitizeText(payload.hotel, 220),
        comments: sanitizeText(payload.comments, 1200),
        cart: Array.isArray(payload.cart) ? payload.cart : [],
        total: safeNumber(payload.total, NaN),
        currency: normalizeCurrency(payload.currency),
        paymentMethod: sanitizeText(payload.paymentMethod || fallbackPaymentMethod || 'paypal', 40).toLowerCase(),
        source: sanitizeText(payload.source, 40) || 'checkout',
        userId: sanitizeText(payload.userId, 64)
    };
}

function validateCheckoutPayload(payload, options) {
    const opts = options || {};
    const allowedMethods = new Set(['paypal', 'bank_transfer', 'manual_contact']);

    if (!payload.guestName || !payload.guestEmail || !payload.guestPhone || !payload.serviceDate) {
        return 'Missing required fields';
    }
    if (!allowedMethods.has(payload.paymentMethod)) {
        return 'Unsupported payment method';
    }
    if (payload.currency !== ORDER_CURRENCY) {
        return `Only ${ORDER_CURRENCY} orders are supported`;
    }
    if (opts.requireTotal !== false) {
        if (!Number.isFinite(payload.total) || payload.total < 0) {
            return 'Invalid total amount';
        }
    }
    if (payload.paymentMethod === 'paypal' && !hasPayPalConfig()) {
        return 'PayPal is not configured';
    }
    if (payload.paymentMethod === 'bank_transfer' && !hasBankTransferConfig()) {
        return 'Bank transfer is not configured';
    }
    return '';
}

function createOrderStateForPaymentMethod(paymentMethod, paypalIntent) {
    if (paymentMethod === 'paypal') {
        return {
            orderStatus: 'pending_payment',
            providerStatus: 'checkout_not_started',
            paymentStatus: 'pending_checkout',
            intent: paypalIntent
        };
    }
    if (paymentMethod === 'bank_transfer') {
        return {
            orderStatus: 'awaiting_transfer',
            providerStatus: 'instructions_issued',
            paymentStatus: 'awaiting_transfer',
            intent: null
        };
    }
    return {
        orderStatus: 'pending_review',
        providerStatus: 'manual_review',
        paymentStatus: null,
        intent: null
    };
}

function loadOrderAggregateByPublicId(publicId) {
    const order = findOrderByPublicIdStmt.get(publicId);
    if (!order) return null;

    return {
        order,
        items: findOrderItemsByOrderIdStmt.all(order.id),
        payment: findPrimaryPaymentByOrderIdStmt.get(order.id) || null
    };
}

function loadOrderAggregateForCustomer(profilePublicId, publicId) {
    const aggregate = loadOrderAggregateByPublicId(publicId);
    if (!aggregate || aggregate.order.user_id !== profilePublicId) return null;
    return aggregate;
}

function serializeCustomerOrderSummary(row) {
    return {
        publicId: row.public_id,
        guestName: row.guest_name,
        guestEmail: row.guest_email,
        guestPhone: row.guest_phone,
        currency: row.currency,
        subtotal: roundCurrencyAmount(row.subtotal),
        feePercent: roundCurrencyAmount(row.fee_percent),
        feeAmount: roundCurrencyAmount(row.fee_amount),
        total: roundCurrencyAmount(row.total_final != null ? row.total_final : row.total),
        totalFinal: roundCurrencyAmount(row.total_final != null ? row.total_final : row.total),
        status: row.status,
        paymentMethod: row.payment_method,
        providerStatus: row.provider_status,
        expiresAt: row.expires_at,
        serviceDate: row.service_date,
        createdAt: row.created_at,
        payment: row.payment_id ? {
            id: row.payment_id,
            status: row.payment_status,
            intent: row.payment_intent
        } : null
    };
}

function persistOrderPatch(orderId, patch) {
    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!current) return null;

    const next = {
        ...current,
        ...patch,
        updated_at: nowAsSqlDateTime()
    };

    db.prepare(`
        UPDATE orders
        SET status = ?, provider_status = ?, paypal_intent = ?, bank_reference = ?, expires_at = ?,
            service_date = ?, pickup_time = ?, hotel = ?, comments = ?, subtotal = ?, fee_percent = ?,
            fee_amount = ?, total_final = ?, updated_at = ?
        WHERE id = ?
    `).run(
        next.status,
        next.provider_status,
        next.paypal_intent,
        next.bank_reference,
        next.expires_at,
        next.service_date,
        next.pickup_time,
        next.hotel,
        next.comments,
        next.subtotal,
        next.fee_percent,
        next.fee_amount,
        next.total_final,
        next.updated_at,
        orderId
    );

    return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

function persistPaymentPatch(paymentId, patch) {
    const current = findPaymentByIdStmt.get(paymentId);
    if (!current) return null;

    const next = {
        ...current,
        ...patch,
        metadata_json: patch && Object.prototype.hasOwnProperty.call(patch, 'metadata_json')
            ? (patch.metadata_json == null || typeof patch.metadata_json === 'string' ? patch.metadata_json : JSON.stringify(patch.metadata_json))
            : current.metadata_json,
        updated_at: nowAsSqlDateTime()
    };

    db.prepare(`
        UPDATE payments
        SET intent = ?, amount = ?, currency = ?, status = ?, provider_status = ?, provider_event_id = ?,
            paypal_order_id = ?, paypal_authorization_id = ?, paypal_capture_id = ?, bank_reference = ?,
            seller_protection_status = ?, paid_at = ?, metadata_json = ?, subtotal = ?, fee_percent = ?,
            fee_amount = ?, total_final = ?, updated_at = ?
        WHERE id = ?
    `).run(
        next.intent,
        next.amount,
        next.currency,
        next.status,
        next.provider_status,
        next.provider_event_id,
        next.paypal_order_id,
        next.paypal_authorization_id,
        next.paypal_capture_id,
        next.bank_reference,
        next.seller_protection_status,
        next.paid_at,
        next.metadata_json,
        next.subtotal,
        next.fee_percent,
        next.fee_amount,
        next.total_final,
        next.updated_at,
        paymentId
    );

    return findPaymentByIdStmt.get(paymentId);
}

function createOrderRecord(payload) {
    const computed = computeServerCartTotals(payload.cart);
    if (computed.error) return { error: computed.error };
    const pricing = computePaymentBreakdown(computed.totalUSD, payload.paymentMethod);

    if (Number.isFinite(payload.total) && !amountsEqual(payload.total, pricing.totalFinal)) {
        return { error: 'Total mismatch. Refresh your cart and try again.' };
    }

    const publicId = createPublicId(ORDER_PUBLIC_ID_PREFIX);
    const paypalIntent = payload.paymentMethod === 'paypal' ? inferPayPalIntentFromCart(computed.normalizedCart) : null;
    const bankReference = payload.paymentMethod === 'bank_transfer' ? buildBankReference(publicId) : null;
    const expiresAt = payload.paymentMethod === 'bank_transfer' ? addHoursToNow(BANK_TRANSFER_EXPIRY_HOURS) : null;
    const initialState = createOrderStateForPaymentMethod(payload.paymentMethod, paypalIntent);

    let orderId = null;
    let paymentId = null;
    const tx = db.transaction(() => {
        const orderInsert = db.prepare(`
            INSERT INTO orders(
                public_id, user_id, guest_name, guest_email, guest_phone, currency, total, subtotal, fee_percent,
                fee_amount, total_final, status,
                payment_method, provider_status, paypal_intent, bank_reference, expires_at, service_date,
                pickup_time, hotel, comments, source, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);
        const orderResult = orderInsert.run(
            publicId,
            payload.userId || null,
            payload.guestName,
            payload.guestEmail,
            payload.guestPhone,
            ORDER_CURRENCY,
            pricing.totalFinal,
            pricing.subtotal,
            pricing.feePercent,
            pricing.feeAmount,
            pricing.totalFinal,
            initialState.orderStatus,
            payload.paymentMethod,
            initialState.providerStatus,
            paypalIntent,
            bankReference,
            expiresAt,
            payload.serviceDate,
            payload.pickupTime || '',
            payload.hotel || '',
            payload.comments || '',
            payload.source || 'checkout',
            nowAsSqlDateTime()
        );
        orderId = orderResult.lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO order_items(
                order_id, tour_slug, tour_title_en, tour_title_es, service_date, adults, children,
                add_ons_json, subtotal, hotel, pickup_time
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
        `);
        computed.normalizedCart.forEach((item) => {
            insertItem.run(
                orderId,
                item.tourId,
                item.name.en,
                item.name.es,
                payload.serviceDate,
                item.adults,
                item.children,
                JSON.stringify(item.addOns || []),
                item.subtotalUSD,
                payload.hotel || '',
                payload.pickupTime || ''
            );
        });

        if (payload.paymentMethod !== 'manual_contact') {
            const insertPayment = db.prepare(`
                INSERT INTO payments(
                    order_id, provider, intent, amount, currency, status, provider_status, bank_reference, metadata_json,
                    subtotal, fee_percent, fee_amount, total_final, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `);
            const paymentResult = insertPayment.run(
                orderId,
                payload.paymentMethod,
                initialState.intent,
                pricing.totalFinal,
                ORDER_CURRENCY,
                initialState.paymentStatus,
                initialState.providerStatus,
                bankReference,
                JSON.stringify({ source: payload.source || 'checkout' }),
                pricing.subtotal,
                pricing.feePercent,
                pricing.feeAmount,
                pricing.totalFinal,
                nowAsSqlDateTime()
            );
            paymentId = paymentResult.lastInsertRowid;
        }

        if (payload.userId) {
            db.prepare(`
                INSERT OR IGNORE INTO order_claims(order_id, profile_public_id, claimed_email, claim_method)
                VALUES(?,?,?,?)
            `).run(orderId, payload.userId, normalizeEmail(payload.guestEmail), 'checkout_authenticated');
        }
    });

    tx();
    logAudit('guest', payload.guestEmail, 'order.created', 'order', publicId, {
        paymentMethod: payload.paymentMethod,
        subtotal: pricing.subtotal,
        feePercent: pricing.feePercent,
        feeAmount: pricing.feeAmount,
        total: pricing.totalFinal,
        currency: ORDER_CURRENCY,
        source: payload.source || 'checkout'
    });

    const aggregate = loadOrderAggregateByPublicId(publicId);
    return {
        orderId,
        paymentId,
        publicId,
        totalUSD: computed.totalUSD,
        normalizedCart: computed.normalizedCart,
        aggregate
    };
}

async function getPayPalAccessToken() {
    if (!hasPayPalConfig()) {
        throw new Error('PayPal is not configured');
    }

    const now = Date.now();
    if (paypalTokenCache.accessToken && paypalTokenCache.expiresAt > now + 30000) {
        return paypalTokenCache.accessToken;
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'PayPal access token request failed');
    }

    paypalTokenCache.accessToken = payload.access_token;
    paypalTokenCache.expiresAt = now + Math.max(60000, safeInt(payload.expires_in, 300) * 1000);
    return payload.access_token;
}

async function callPayPalApi(endpoint, options) {
    const opts = options || {};
    const token = await getPayPalAccessToken();
    const headers = new Headers(opts.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    if (opts.body != null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${PAYPAL_API_BASE}${endpoint}`, {
        method: opts.method || 'GET',
        headers,
        body: opts.body == null ? undefined : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
    });

    const text = await response.text();
    const payload = text ? parseJsonSafely(text, { raw: text }) : {};
    if (!response.ok) {
        const details = payload && payload.details && payload.details[0] ? payload.details[0].description : '';
        const message = payload && payload.message ? payload.message : details;
        throw new Error(message || `PayPal API request failed (${response.status})`);
    }
    return payload;
}

function extractPayPalCapture(orderResponse) {
    const purchaseUnits = Array.isArray(orderResponse && orderResponse.purchase_units) ? orderResponse.purchase_units : [];
    const payments = purchaseUnits[0] && purchaseUnits[0].payments ? purchaseUnits[0].payments : {};
    const captures = Array.isArray(payments.captures) ? payments.captures : [];
    return captures[0] || null;
}

function extractPayPalAuthorization(orderResponse) {
    const purchaseUnits = Array.isArray(orderResponse && orderResponse.purchase_units) ? orderResponse.purchase_units : [];
    const payments = purchaseUnits[0] && purchaseUnits[0].payments ? purchaseUnits[0].payments : {};
    const authorizations = Array.isArray(payments.authorizations) ? payments.authorizations : [];
    return authorizations[0] || null;
}

function extractPayPalPayer(orderResponse) {
    const payer = orderResponse && typeof orderResponse.payer === 'object' && orderResponse.payer
        ? orderResponse.payer
        : {};
    const name = payer && typeof payer.name === 'object' && payer.name ? payer.name : {};
    const givenName = sanitizeText(name.given_name || payer.given_name || payer.first_name, 80);
    const surname = sanitizeText(name.surname || payer.surname || payer.last_name, 80);
    const fullName = sanitizeText([givenName, surname].filter(Boolean).join(' '), 180);
    const normalized = {
        payerId: sanitizeText(payer.payer_id || payer.id, 64) || null,
        email: sanitizeText(payer.email_address || payer.email, 180) || null,
        givenName: givenName || null,
        surname: surname || null,
        fullName: fullName || null,
        countryCode: sanitizeText(payer.address && payer.address.country_code, 8) || null,
        status: sanitizeText(payer.status, 40) || null,
        imageUrl: sanitizeText(payer.image_url || payer.picture || payer.avatar_url || payer.photo_url, 512) || null
    };
    if (!normalized.payerId && !normalized.email && !normalized.fullName && !normalized.imageUrl) {
        return null;
    }
    return normalized;
}

function findPaymentByPayPalResource(resource) {
    const relatedIds = resource && resource.supplementary_data && resource.supplementary_data.related_ids
        ? resource.supplementary_data.related_ids
        : {};
    const captureId = sanitizeText(resource && resource.id, 64);
    const paypalOrderId = sanitizeText(relatedIds && relatedIds.order_id, 64);
    const authorizationId = sanitizeText(relatedIds && relatedIds.authorization_id, 64);

    if (captureId) {
        const byCapture = findPaymentByCaptureIdStmt.get(captureId);
        if (byCapture) return byCapture;
    }
    if (authorizationId) {
        const byAuthorization = findPaymentByAuthorizationIdStmt.get(authorizationId);
        if (byAuthorization) return byAuthorization;
    }
    if (paypalOrderId) {
        const byOrder = findPaymentByPayPalOrderIdStmt.get(paypalOrderId);
        if (byOrder) return byOrder;
    }
    return null;
}

function syncOrderAndPaymentFromPayPal(payment, patch) {
    const nextPayment = persistPaymentPatch(payment.id, patch.payment);
    const nextOrder = persistOrderPatch(payment.order_id, patch.order);
    return { payment: nextPayment, order: nextOrder };
}

const JPG_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const rawSlug = req.body && req.body.slug ? req.body.slug : `new-tour-${Date.now()}`;
        const slug = sanitizeSlug(rawSlug);
        req.uploadSlug = slug;
        const dir = path.join(__dirname, 'public', 'imagenes', 'servicios', slug);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const base = path.basename(String(file.originalname || ''), path.extname(String(file.originalname || '')));
        const parsed = safeInt(base, NaN);
        const fileNum = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
        cb(null, `${fileNum}.jpg`);
    }
});

const upload = multer({
    storage,
    limits: {
        files: 40,
        fileSize: 8 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!JPG_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
            return cb(new Error('Solo se permiten imágenes JPG/JPEG'));
        }
        cb(null, true);
    }
});

const TRANSFER_PROOF_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'application/pdf'
]);

const transferProofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const publicId = sanitizeText(req.params && req.params.publicId, 64);
        const dir = path.join(PRIVATE_STORAGE_PATH, 'transfer-proofs', publicId || 'unknown');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(String(file.originalname || '')).toLowerCase();
        const safeExtension = ['.jpg', '.jpeg', '.png', '.pdf'].includes(extension) ? extension : '.bin';
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExtension}`);
    }
});

const uploadTransferProof = multer({
    storage: transferProofStorage,
    limits: {
        files: 1,
        fileSize: 8 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!TRANSFER_PROOF_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
            return cb(new Error('Only JPG, PNG, or PDF transfer proofs are allowed'));
        }
        cb(null, true);
    }
});

app.use(cors());
app.post('/api/webhooks/paypal', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!hasPayPalConfig() || !PAYPAL_WEBHOOK_ID) {
        return res.status(503).json({ error: 'PayPal webhook verification is not configured' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    const event = parseJsonSafely(rawBody, null);
    if (!event || !event.id || !event.event_type) {
        return res.status(400).json({ error: 'Invalid PayPal webhook payload' });
    }

    const existingInbox = db.prepare('SELECT id FROM payment_webhook_inbox WHERE provider = ? AND provider_event_id = ? LIMIT 1')
        .get('paypal', sanitizeText(event.id, 120));
    if (existingInbox) {
        return res.json({ status: 'duplicate' });
    }

    try {
        const verification = await callPayPalApi('/v1/notifications/verify-webhook-signature', {
            method: 'POST',
            body: {
                auth_algo: req.headers['paypal-auth-algo'],
                cert_url: req.headers['paypal-cert-url'],
                transmission_id: req.headers['paypal-transmission-id'],
                transmission_sig: req.headers['paypal-transmission-sig'],
                transmission_time: req.headers['paypal-transmission-time'],
                webhook_id: PAYPAL_WEBHOOK_ID,
                webhook_event: event
            }
        });

        if (verification.verification_status !== 'SUCCESS') {
            return res.status(400).json({ error: 'PayPal webhook signature verification failed' });
        }

        const matchedPayment = findPaymentByPayPalResource(event.resource || {});
        const receivedAt = nowAsSqlDateTime();
        const inboxResult = db.prepare(`
            INSERT INTO payment_webhook_inbox(provider, payment_id, event_type, provider_event_id, payload, verification_status, processed_at)
            VALUES(?,?,?,?,?,?,?)
        `).run(
            'paypal',
            matchedPayment ? matchedPayment.id : null,
            sanitizeText(event.event_type, 120),
            sanitizeText(event.id, 120),
            rawBody,
            'verified',
            receivedAt
        );

        if (matchedPayment) {
            const eventType = sanitizeText(event.event_type, 120);
            const resource = event.resource || {};
            if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
                syncOrderAndPaymentFromPayPal(matchedPayment, {
                    payment: {
                        status: 'paid',
                        provider_status: sanitizeText(resource.status, 40) || 'COMPLETED',
                        provider_event_id: sanitizeText(event.id, 120),
                        paypal_capture_id: sanitizeText(resource.id, 64) || matchedPayment.paypal_capture_id,
                        seller_protection_status: sanitizeText(resource.seller_protection && resource.seller_protection.status, 40),
                        paid_at: sanitizeText(resource.create_time, 40) || receivedAt,
                        metadata_json: resource
                    },
                    order: {
                        status: 'paid',
                        provider_status: 'PAYMENT.CAPTURE.COMPLETED'
                    }
                });
            } else if (eventType === 'PAYMENT.CAPTURE.PENDING') {
                syncOrderAndPaymentFromPayPal(matchedPayment, {
                    payment: {
                        status: 'pending_review',
                        provider_status: sanitizeText(resource.status, 40) || 'PENDING',
                        provider_event_id: sanitizeText(event.id, 120),
                        paypal_capture_id: sanitizeText(resource.id, 64) || matchedPayment.paypal_capture_id,
                        metadata_json: resource
                    },
                    order: {
                        status: 'payment_pending',
                        provider_status: 'PAYMENT.CAPTURE.PENDING'
                    }
                });
            } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
                syncOrderAndPaymentFromPayPal(matchedPayment, {
                    payment: {
                        status: 'denied',
                        provider_status: sanitizeText(resource.status, 40) || 'DENIED',
                        provider_event_id: sanitizeText(event.id, 120),
                        paypal_capture_id: sanitizeText(resource.id, 64) || matchedPayment.paypal_capture_id,
                        metadata_json: resource
                    },
                    order: {
                        status: 'payment_failed',
                        provider_status: 'PAYMENT.CAPTURE.DENIED'
                    }
                });
            } else if (eventType === 'PAYMENT.AUTHORIZATION.CREATED') {
                syncOrderAndPaymentFromPayPal(matchedPayment, {
                    payment: {
                        status: 'authorized',
                        provider_status: sanitizeText(resource.status, 40) || 'CREATED',
                        provider_event_id: sanitizeText(event.id, 120),
                        paypal_authorization_id: sanitizeText(resource.id, 64) || matchedPayment.paypal_authorization_id,
                        metadata_json: resource
                    },
                    order: {
                        status: 'payment_authorized',
                        provider_status: 'PAYMENT.AUTHORIZATION.CREATED'
                    }
                });
            } else if (eventType === 'PAYMENT.AUTHORIZATION.VOIDED') {
                syncOrderAndPaymentFromPayPal(matchedPayment, {
                    payment: {
                        status: 'voided',
                        provider_status: sanitizeText(resource.status, 40) || 'VOIDED',
                        provider_event_id: sanitizeText(event.id, 120),
                        metadata_json: resource
                    },
                    order: {
                        status: 'payment_voided',
                        provider_status: 'PAYMENT.AUTHORIZATION.VOIDED'
                    }
                });
            }

            logAudit('system', 'paypal-webhook', 'payment.webhook_processed', 'payment', matchedPayment.id, {
                webhookInboxId: inboxResult.lastInsertRowid,
                eventType
            });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('PayPal webhook error:', error);
        res.status(500).json({ error: error.message || 'Webhook processing failed' });
    }
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- API ROUTES ----

app.post('/api/admin/login', (req, res) => {
    const username = sanitizeText(req.body && req.body.username, 128);
    const password = String(req.body && req.body.password ? req.body.password : '').trim();

    if (!hasValidAdminCredentials(username, password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createAdminToken();
    const expiresAt = Date.now() + ADMIN_TOKEN_TTL_MS;
    adminSessions.set(token, { username, expiresAt });

    res.json({ status: 'ok', token, expiresAt });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
    adminSessions.delete(req.adminToken);
    res.json({ status: 'ok' });
});

app.get('/api/admin/session', requireAdmin, (req, res) => {
    res.json({ status: 'ok', username: req.admin.username, expiresAt: req.admin.expiresAt });
});

// GET all tours (catalog)
app.get('/api/tours', (req, res) => {
    const tours = db.prepare(`
        SELECT t.*, GROUP_CONCAT(DISTINCT g.image_num) AS gallery_images
        FROM tours t
        LEFT JOIN gallery_images g ON g.tour_id = t.id
        GROUP BY t.id
    `).all();
    const pricing = db.prepare('SELECT * FROM pricing_tiers ORDER BY tour_id, adults').all();
    const includes = db.prepare('SELECT * FROM tour_includes ORDER BY tour_id, id').all();
    const excludes = db.prepare('SELECT * FROM tour_excludes ORDER BY tour_id, id').all();
    const itinerary = db.prepare('SELECT * FROM itinerary_steps ORDER BY tour_id, step_order').all();
    const addons = db.prepare('SELECT * FROM addons ORDER BY tour_id, id').all();
    const packing = db.prepare('SELECT * FROM packing_items ORDER BY tour_id, id').all();

    const result = tours.map((t) => {
        const tid = t.id;
        const dbGalleryImages = t.gallery_images ? t.gallery_images.split(',').map(Number).filter(Number.isFinite) : [];
        const diskGalleryImages = readGalleryImagesFromFolder(t.image_folder);
        const galleryImages = mergeUniqueNumbers(dbGalleryImages, diskGalleryImages);

        return {
            id: t.slug,
            imageFolder: t.image_folder,
            card: {
                thumbnail: t.card_thumbnail,
                title: { en: t.title_en, es: t.title_es },
                shortDescription: { en: t.short_desc_en, es: t.short_desc_es },
                priceFrom: t.price_from
            },
            hero: {
                title: { en: t.title_en, es: t.title_es },
                subtitle: { en: t.subtitle_en, es: t.subtitle_es },
                description: { en: t.description_en, es: t.description_es },
                heroImage: t.hero_image
            },
            gallery: {
                images: galleryImages,
                title: { en: 'Gallery', es: 'Galería' }
            },
            pricing: {
                sectionTitle: { en: 'Pricing', es: 'Precios' },
                tableHeader: {
                    adults: {
                        en: t.price_adults_label_en || 'Number of Adults',
                        es: t.price_adults_label_es || 'Número de Adultos'
                    },
                    adultPrice: {
                        en: t.price_adult_price_label_en || 'Price per Adult (13+)',
                        es: t.price_adult_price_label_es || 'Precio por Adulto (13+)'
                    },
                    childPrice: {
                        en: t.price_child_price_label_en || 'Price per Child (5-12)',
                        es: t.price_child_price_label_es || 'Precio por Niño (5-12)'
                    }
                },
                tiers: pricing
                    .filter((p) => p.tour_id === tid)
                    .map((p) => ({ adults: p.adults, adultPrice: p.adult_price })),
                childPriceFlat: t.child_price_flat,
                freeChildNote: { en: t.free_child_note_en, es: t.free_child_note_es },
                groupNote: { en: t.group_note_en, es: t.group_note_es },
                pricingNote: { en: t.pricing_note_en, es: t.pricing_note_es }
            },
            includes: {
                sectionTitle: { en: 'What Is Included', es: 'Qué Incluye' },
                items: includes.filter((i) => i.tour_id === tid).map((i) => ({ en: i.text_en, es: i.text_es })),
                excludesTitle: { en: 'Not Included', es: 'No Incluye' },
                excludes: excludes.filter((e) => e.tour_id === tid).map((e) => ({ en: e.text_en, es: e.text_es }))
            },
            itinerary: {
                sectionTitle: { en: t.itinerary_title_en || 'Itinerary', es: t.itinerary_title_es || 'Itinerario' },
                steps: itinerary.filter((s) => s.tour_id === tid).map((s) => ({ en: s.text_en, es: s.text_es })),
                warning: { en: t.itinerary_warning_en, es: t.itinerary_warning_es },
                ...(t.combo_note_en ? { comboNote: { en: t.combo_note_en, es: t.combo_note_es } } : {})
            },
            addOns: {
                sectionTitle: { en: 'Add-On Options', es: 'Opciones Adicionales' },
                options: addons.filter((a) => a.tour_id === tid).map((a) => ({
                    id: a.slug,
                    title: { en: a.title_en, es: a.title_es },
                    description: { en: a.desc_en, es: a.desc_es },
                    pricePerPerson: a.price_per_person
                }))
            },
            packingList: {
                sectionTitle: { en: 'What to Bring', es: 'Qué Llevar' },
                items: packing.filter((p) => p.tour_id === tid).map((p) => ({ en: p.text_en, es: p.text_es, icon: p.icon }))
            },
            booking: {
                sectionTitle: { en: 'Booking Information', es: 'Información de Reservación' },
                description: { en: t.booking_desc_en, es: t.booking_desc_es }
            }
        };
    });

    res.json(result);
});

// GET single tour
app.get('/api/tours/:slug', (req, res) => {
    const t = db.prepare('SELECT * FROM tours WHERE slug = ?').get(req.params.slug);
    if (!t) return res.status(404).json({ error: 'Tour not found' });
    res.json(t);
});

// POST new tour (Admin)
app.post('/api/tours', requireAdmin, upload.any(), (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        const slug = sanitizeSlug(req.body.slug || data.slug || req.uploadSlug);
        const imageFolder = `imagenes/servicios/${slug}`;

        const insertTour = db.prepare(`
            INSERT INTO tours(
                slug, image_folder, card_thumbnail, title_en, title_es, short_desc_en, short_desc_es, price_from,
                subtitle_en, subtitle_es, description_en, description_es, hero_image,
                price_adults_label_en, price_adults_label_es, price_adult_price_label_en, price_adult_price_label_es,
                price_child_price_label_en, price_child_price_label_es, child_price_flat,
                free_child_note_en, free_child_note_es, group_note_en, group_note_es, pricing_note_en, pricing_note_es,
                itinerary_title_en, itinerary_title_es, itinerary_warning_en, itinerary_warning_es, combo_note_en, combo_note_es,
                booking_desc_en, booking_desc_es
            ) VALUES(
                ?,?,?,?,?,?,?,?,
                ?,?,?,?, ?,
                ?,?,?,?,
                ?,?, ?,
                ?,?,?,?, ?,?,
                ?,?,?,?, ?,?,
                ?,?
            )
        `);

        const uploadedNumbers = (req.files || [])
            .map((f) => safeInt(path.basename(f.filename, path.extname(f.filename)), NaN))
            .filter((n) => Number.isFinite(n));
        const uploadedGallery = uploadedNumbers.filter((n) => n >= 3).sort((a, b) => a - b);

        const requestedGallery = Array.isArray(data.gallery_images)
            ? data.gallery_images.map((n) => safeInt(n, NaN)).filter((n) => Number.isFinite(n) && n >= 1)
            : [];
        const galleryToSave = requestedGallery.length > 0 ? requestedGallery : uploadedGallery;

        let tourId;
        db.transaction(() => {
            const r = insertTour.run(
                slug,
                imageFolder,
                safeInt(data.card_thumbnail, 1),
                sanitizeText(data.title_en, 255),
                sanitizeText(data.title_es, 255),
                sanitizeText(data.short_desc_en, 1200),
                sanitizeText(data.short_desc_es, 1200),
                safeInt(data.price_from, 0),
                sanitizeText(data.subtitle_en, 500),
                sanitizeText(data.subtitle_es, 500),
                sanitizeText(data.description_en, 5000),
                sanitizeText(data.description_es, 5000),
                safeInt(data.hero_image, 1),
                sanitizeText(data.price_adults_label_en, 255),
                sanitizeText(data.price_adults_label_es, 255),
                sanitizeText(data.price_adult_price_label_en, 255),
                sanitizeText(data.price_adult_price_label_es, 255),
                sanitizeText(data.price_child_price_label_en, 255),
                sanitizeText(data.price_child_price_label_es, 255),
                safeInt(data.child_price_flat, 0),
                sanitizeText(data.free_child_note_en, 1200),
                sanitizeText(data.free_child_note_es, 1200),
                sanitizeText(data.group_note_en, 1200),
                sanitizeText(data.group_note_es, 1200),
                sanitizeText(data.pricing_note_en, 1200),
                sanitizeText(data.pricing_note_es, 1200),
                sanitizeText(data.itinerary_title_en, 255) || 'Itinerary',
                sanitizeText(data.itinerary_title_es, 255) || 'Itinerario',
                sanitizeText(data.itinerary_warning_en, 1200),
                sanitizeText(data.itinerary_warning_es, 1200),
                sanitizeText(data.combo_note_en, 1200) || null,
                sanitizeText(data.combo_note_es, 1200) || null,
                sanitizeText(data.booking_desc_en, 5000),
                sanitizeText(data.booking_desc_es, 5000)
            );

            tourId = r.lastInsertRowid;

            if (Array.isArray(data.pricing_tiers)) {
                const insPrice = db.prepare('INSERT INTO pricing_tiers(tour_id, adults, adult_price) VALUES(?,?,?)');
                data.pricing_tiers.forEach((p) => {
                    const adults = safeInt(p.adults, NaN);
                    const adultPrice = safeInt(p.adult_price, NaN);
                    if (Number.isFinite(adults) && Number.isFinite(adultPrice)) {
                        insPrice.run(tourId, adults, adultPrice);
                    }
                });
            }

            if (Array.isArray(data.includes)) {
                const insInc = db.prepare('INSERT INTO tour_includes(tour_id, text_en, text_es) VALUES(?,?,?)');
                data.includes.forEach((i) => insInc.run(tourId, sanitizeText(i.en, 1200), sanitizeText(i.es, 1200)));
            }

            if (Array.isArray(data.excludes)) {
                const insExc = db.prepare('INSERT INTO tour_excludes(tour_id, text_en, text_es) VALUES(?,?,?)');
                data.excludes.forEach((e) => insExc.run(tourId, sanitizeText(e.en, 1200), sanitizeText(e.es, 1200)));
            }

            if (Array.isArray(data.itinerary)) {
                const insIt = db.prepare('INSERT INTO itinerary_steps(tour_id, step_order, text_en, text_es) VALUES(?,?,?,?)');
                data.itinerary.forEach((it, idx) => {
                    insIt.run(tourId, idx + 1, sanitizeText(it.en, 1500), sanitizeText(it.es, 1500));
                });
            }

            if (Array.isArray(data.addons)) {
                const insAdd = db.prepare('INSERT INTO addons(tour_id, slug, title_en, title_es, desc_en, desc_es, price_per_person) VALUES(?,?,?,?,?,?,?)');
                data.addons.forEach((a) => {
                    insAdd.run(
                        tourId,
                        sanitizeSlug(a.slug),
                        sanitizeText(a.title_en, 255),
                        sanitizeText(a.title_es, 255),
                        sanitizeText(a.desc_en, 1200),
                        sanitizeText(a.desc_es, 1200),
                        safeInt(a.price_per_person, 0)
                    );
                });
            }

            if (Array.isArray(data.packing)) {
                const insPack = db.prepare('INSERT INTO packing_items(tour_id, text_en, text_es, icon) VALUES(?,?,?,?)');
                data.packing.forEach((p) => {
                    insPack.run(tourId, sanitizeText(p.en, 255), sanitizeText(p.es, 255), sanitizeText(p.icon, 50));
                });
            }

            if (galleryToSave.length > 0) {
                const insGal = db.prepare('INSERT INTO gallery_images(tour_id, image_num) VALUES(?,?)');
                galleryToSave.forEach((g) => insGal.run(tourId, g));
            }
        })();

        res.json({ status: 'ok', id: tourId, slug });
    } catch (e) {
        if (String(e.message || '').includes('UNIQUE constraint failed: tours.slug')) {
            return res.status(409).json({ error: 'Slug already exists' });
        }
        console.error('Error saving tour:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET hotels
app.get('/api/hotels', (req, res) => {
    const h = db.prepare('SELECT name as n, zone as z FROM hotels ORDER BY zone, name').all();
    res.json(h);
});

app.post('/api/orders/quote', (req, res) => {
    const payload = req.body || {};
    const cart = Array.isArray(payload.cart) ? payload.cart : [];
    const paymentMethod = sanitizeText(payload.paymentMethod || 'paypal', 40).toLowerCase();
    const currency = normalizeCurrency(payload.currency);

    if (currency !== ORDER_CURRENCY) {
        return res.status(400).json({ error: `Only ${ORDER_CURRENCY} orders are supported` });
    }
    if (paymentMethod === 'paypal' && !hasPayPalConfig()) {
        return res.status(503).json({ error: 'PayPal is not configured' });
    }
    if (paymentMethod === 'bank_transfer' && !hasBankTransferConfig()) {
        return res.status(503).json({ error: 'Bank transfer is not configured' });
    }

    const computed = computeServerCartTotals(cart);
    if (computed.error) {
        return res.status(400).json({ error: computed.error });
    }
    const pricing = computePaymentBreakdown(computed.totalUSD, paymentMethod);

    const paypalIntent = paymentMethod === 'paypal' ? inferPayPalIntentFromCart(computed.normalizedCart) : null;
    res.json({
        status: 'ok',
        currency: ORDER_CURRENCY,
        subtotal: pricing.subtotal,
        feePercent: pricing.feePercent,
        feeAmount: pricing.feeAmount,
        total: pricing.totalFinal,
        totalFinal: pricing.totalFinal,
        paymentMethod,
        paypalIntent,
        cart: computed.normalizedCart
    });
});

app.post('/api/orders', (req, res) => {
    const payload = normalizeCheckoutPayload(req.body, 'paypal');
    const validationError = validateCheckoutPayload(payload, { requireTotal: true });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const customerToken = readCustomerToken(req);
    const customerSession = customerToken ? loadCustomerSessionByToken(customerToken) : null;
    if (customerSession) {
        payload.userId = customerSession.profilePublicId;
        if (!payload.guestEmail) {
            payload.guestEmail = customerSession.email;
        }
    }

    const created = createOrderRecord(payload);
    if (created.error) {
        return res.status(400).json({ error: created.error });
    }

    const portalSession = createCustomerPortalSession(created.aggregate.order);

    res.json({
        status: 'ok',
        order: {
            publicId: created.aggregate.order.public_id,
            subtotal: roundCurrencyAmount(created.aggregate.order.subtotal),
            feePercent: roundCurrencyAmount(created.aggregate.order.fee_percent),
            feeAmount: roundCurrencyAmount(created.aggregate.order.fee_amount),
            total: roundCurrencyAmount(created.aggregate.order.total_final != null ? created.aggregate.order.total_final : created.aggregate.order.total),
            totalFinal: roundCurrencyAmount(created.aggregate.order.total_final != null ? created.aggregate.order.total_final : created.aggregate.order.total),
            currency: created.aggregate.order.currency,
            paymentMethod: created.aggregate.order.payment_method,
            status: created.aggregate.order.status,
            providerStatus: created.aggregate.order.provider_status,
            paypalIntent: created.aggregate.order.paypal_intent,
            expiresAt: created.aggregate.order.expires_at
        },
        payment: created.aggregate.payment ? {
            id: created.aggregate.payment.id,
            subtotal: roundCurrencyAmount(created.aggregate.payment.subtotal),
            feePercent: roundCurrencyAmount(created.aggregate.payment.fee_percent),
            feeAmount: roundCurrencyAmount(created.aggregate.payment.fee_amount),
            amount: roundCurrencyAmount(created.aggregate.payment.total_final != null ? created.aggregate.payment.total_final : created.aggregate.payment.amount),
            totalFinal: roundCurrencyAmount(created.aggregate.payment.total_final != null ? created.aggregate.payment.total_final : created.aggregate.payment.amount),
            status: created.aggregate.payment.status,
            providerStatus: created.aggregate.payment.provider_status,
            bankReference: created.aggregate.payment.bank_reference
        } : null,
        bankTransfer: created.aggregate.order.payment_method === 'bank_transfer' ? {
            bankName: BANK_TRANSFER_BANK_NAME,
            beneficiary: BANK_TRANSFER_BENEFICIARY,
            clabe: BANK_TRANSFER_CLABE,
            account: BANK_TRANSFER_ACCOUNT || null,
            cardNumber: BANK_TRANSFER_CARD_NUMBER || null,
            swift: BANK_TRANSFER_SWIFT || null,
            reference: created.aggregate.order.bank_reference,
            expiresAt: created.aggregate.order.expires_at
        } : null,
        portal: portalSession
    });
});

app.post('/api/payments/paypal/create-order', async (req, res) => {
    const orderPublicId = sanitizeText(req.body && req.body.orderPublicId, 64);
    const returnUrl = normalizePublicCheckoutUrl(req.body && req.body.returnUrl, req);
    const cancelUrl = normalizePublicCheckoutUrl(req.body && req.body.cancelUrl, req);
    if (!orderPublicId) {
        return res.status(400).json({ error: 'Missing orderPublicId' });
    }
    if (!hasPayPalConfig()) {
        return res.status(503).json({ error: 'PayPal is not configured' });
    }

    const aggregate = loadOrderAggregateByPublicId(orderPublicId);
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (!aggregate.payment || aggregate.payment.provider !== 'paypal') {
        return res.status(400).json({ error: 'Order is not configured for PayPal' });
    }
    if (aggregate.order.status === 'paid') {
        return res.status(409).json({ error: 'Order is already paid' });
    }

    try {
        if (aggregate.payment.paypal_order_id) {
            return res.json({
                status: 'ok',
                orderPublicId: aggregate.order.public_id,
                paypalOrderId: aggregate.payment.paypal_order_id,
                intent: aggregate.payment.intent || aggregate.order.paypal_intent || 'CAPTURE'
            });
        }

        const paypalOrder = await callPayPalApi('/v2/checkout/orders', {
            method: 'POST',
            headers: {
                Prefer: 'return=representation',
                'PayPal-Request-Id': `${aggregate.order.public_id}-create`
            },
            body: {
                intent: aggregate.payment.intent || aggregate.order.paypal_intent || 'CAPTURE',
                purchase_units: [{
                    reference_id: aggregate.order.public_id,
                    custom_id: aggregate.order.public_id,
                    invoice_id: aggregate.order.public_id,
                    description: buildOrderDescription(aggregate.items),
                    amount: {
                        currency_code: aggregate.order.currency,
                        value: toPayPalAmount(aggregate.order.total_final != null ? aggregate.order.total_final : aggregate.order.total)
                    }
                }],
                ...(returnUrl && cancelUrl ? {
                    payment_source: {
                        paypal: {
                            experience_context: {
                                user_action: 'PAY_NOW',
                                return_url: returnUrl,
                                cancel_url: cancelUrl
                            }
                        }
                    }
                } : {})
            }
        });

        const approvalLink = Array.isArray(paypalOrder.links)
            ? paypalOrder.links.find((link) => link && link.rel === 'approve')
            : null;

        persistPaymentPatch(aggregate.payment.id, {
            status: 'created',
            provider_status: sanitizeText(paypalOrder.status, 40) || 'CREATED',
            paypal_order_id: sanitizeText(paypalOrder.id, 64),
            metadata_json: paypalOrder
        });
        persistOrderPatch(aggregate.order.id, {
            provider_status: sanitizeText(paypalOrder.status, 40) || 'CREATED'
        });
        logAudit('guest', aggregate.order.guest_email, 'paypal.order_created', 'order', aggregate.order.public_id, {
            paypalOrderId: paypalOrder.id,
            intent: aggregate.payment.intent || aggregate.order.paypal_intent || 'CAPTURE'
        });

        res.json({
            status: 'ok',
            orderPublicId: aggregate.order.public_id,
            paypalOrderId: paypalOrder.id,
            intent: aggregate.payment.intent || aggregate.order.paypal_intent || 'CAPTURE',
            approveUrl: approvalLink ? approvalLink.href : null
        });
    } catch (error) {
        console.error('PayPal create order error:', error);
        res.status(502).json({ error: error.message || 'PayPal order creation failed' });
    }
});

app.post('/api/payments/paypal/cancel', (req, res) => {
    const orderPublicId = sanitizeText(req.body && req.body.orderPublicId, 64);
    const paypalOrderId = sanitizeText(req.body && req.body.paypalOrderId, 64);
    if (!orderPublicId) {
        return res.status(400).json({ error: 'Missing orderPublicId' });
    }

    const aggregate = loadOrderAggregateByPublicId(orderPublicId);
    if (!aggregate || !aggregate.payment) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (aggregate.payment.provider !== 'paypal') {
        return res.status(400).json({ error: 'Order is not configured for PayPal' });
    }
    if (aggregate.payment.paypal_order_id && paypalOrderId && aggregate.payment.paypal_order_id !== paypalOrderId) {
        return res.status(409).json({ error: 'PayPal order mismatch' });
    }
    if (aggregate.order.status === 'paid') {
        return res.status(409).json({ error: 'Order is already paid' });
    }

    syncOrderAndPaymentFromPayPal(aggregate.payment, {
        payment: {
            status: 'cancelled',
            provider_status: 'CHECKOUT_CANCELLED',
            paypal_order_id: aggregate.payment.paypal_order_id || paypalOrderId || null
        },
        order: {
            status: 'payment_cancelled',
            provider_status: 'CHECKOUT_CANCELLED'
        }
    });

    logAudit('guest', aggregate.order.guest_email, 'paypal.cancelled', 'order', aggregate.order.public_id, {
        paypalOrderId: aggregate.payment.paypal_order_id || paypalOrderId || null
    });

    const refreshed = loadOrderAggregateByPublicId(orderPublicId);
    res.json({
        status: 'ok',
        order: {
            publicId: refreshed.order.public_id,
            status: refreshed.order.status,
            providerStatus: refreshed.order.provider_status
        },
        payment: refreshed.payment ? {
            id: refreshed.payment.id,
            status: refreshed.payment.status,
            providerStatus: refreshed.payment.provider_status,
            paypalOrderId: refreshed.payment.paypal_order_id
        } : null
    });
});

app.post('/api/payments/paypal/finalize', async (req, res) => {
    const orderPublicId = sanitizeText(req.body && req.body.orderPublicId, 64);
    const paypalOrderId = sanitizeText(req.body && req.body.paypalOrderId, 64);
    if (!orderPublicId || !paypalOrderId) {
        return res.status(400).json({ error: 'Missing orderPublicId or paypalOrderId' });
    }

    const aggregate = loadOrderAggregateByPublicId(orderPublicId);
    if (!aggregate || !aggregate.payment) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (aggregate.payment.provider !== 'paypal') {
        return res.status(400).json({ error: 'Order is not configured for PayPal' });
    }
    if (aggregate.payment.paypal_order_id && aggregate.payment.paypal_order_id !== paypalOrderId) {
        return res.status(409).json({ error: 'PayPal order mismatch' });
    }

    try {
        const isAuthorize = (aggregate.payment.intent || aggregate.order.paypal_intent) === 'AUTHORIZE';
        const endpoint = isAuthorize
            ? `/v2/checkout/orders/${paypalOrderId}/authorize`
            : `/v2/checkout/orders/${paypalOrderId}/capture`;
        const requestId = `${aggregate.order.public_id}-${isAuthorize ? 'authorize' : 'capture'}`;
        const paypalResult = await callPayPalApi(endpoint, {
            method: 'POST',
            headers: {
                Prefer: 'return=representation',
                'PayPal-Request-Id': requestId
            },
            body: {}
        });

        if (isAuthorize) {
            const authorization = extractPayPalAuthorization(paypalResult);
            const authorizationStatus = sanitizeText(authorization && authorization.status, 40)
                || sanitizeText(paypalResult.status, 40)
                || 'CREATED';
            const authorized = authorizationStatus === 'CREATED' || authorizationStatus === 'AUTHORIZED';
            const paymentStatus = authorized ? 'authorized' : 'authorization_pending';
            const orderStatus = authorized ? 'payment_authorized' : 'payment_pending';

            syncOrderAndPaymentFromPayPal(aggregate.payment, {
                payment: {
                    status: paymentStatus,
                    provider_status: authorizationStatus,
                    paypal_order_id: sanitizeText(paypalResult.id, 64) || paypalOrderId,
                    paypal_authorization_id: sanitizeText(authorization && authorization.id, 64),
                    metadata_json: paypalResult
                },
                order: {
                    status: orderStatus,
                    provider_status: authorizationStatus
                }
            });
        } else {
            const capture = extractPayPalCapture(paypalResult);
            const providerStatus = sanitizeText(capture && capture.status, 40) || sanitizeText(paypalResult.status, 40) || 'COMPLETED';
            const paid = providerStatus === 'COMPLETED';

            syncOrderAndPaymentFromPayPal(aggregate.payment, {
                payment: {
                    status: paid ? 'paid' : 'pending_review',
                    provider_status: providerStatus,
                    paypal_order_id: sanitizeText(paypalResult.id, 64) || paypalOrderId,
                    paypal_capture_id: sanitizeText(capture && capture.id, 64),
                    seller_protection_status: sanitizeText(capture && capture.seller_protection && capture.seller_protection.status, 40),
                    paid_at: paid ? nowAsSqlDateTime() : null,
                    metadata_json: paypalResult
                },
                order: {
                    status: paid ? 'paid' : 'payment_pending',
                    provider_status: providerStatus
                }
            });
        }

        const payer = extractPayPalPayer(paypalResult);

        logAudit('guest', aggregate.order.guest_email, 'paypal.finalized', 'order', aggregate.order.public_id, {
            paypalOrderId,
            intent: aggregate.payment.intent || aggregate.order.paypal_intent
        });

        const refreshed = loadOrderAggregateByPublicId(orderPublicId);
        res.json({
            status: 'ok',
            order: {
                publicId: refreshed.order.public_id,
                status: refreshed.order.status,
                providerStatus: refreshed.order.provider_status
            },
            payment: refreshed.payment ? {
                id: refreshed.payment.id,
                status: refreshed.payment.status,
                providerStatus: refreshed.payment.provider_status,
                paypalOrderId: refreshed.payment.paypal_order_id,
                paypalAuthorizationId: refreshed.payment.paypal_authorization_id,
                paypalCaptureId: refreshed.payment.paypal_capture_id
            } : null,
            payer
        });
    } catch (error) {
        console.error('PayPal finalize error:', error);
        res.status(502).json({ error: error.message || 'PayPal finalize failed' });
    }
});

function downloadPrivateOrderDocument(order, documentId, res) {
    const document = db.prepare('SELECT * FROM documents WHERE id = ? AND order_id = ? LIMIT 1').get(documentId, order.id);
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = resolvePrivatePath(document.storage_path);
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Stored document not found' });
    }

    return res.download(filePath);
}

function handleTransferProofUpload(req, res, aggregate, actorType, actorId) {
    if (!aggregate || !aggregate.payment) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (aggregate.payment.provider !== 'bank_transfer') {
        return res.status(400).json({ error: 'Order is not configured for bank transfer' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Proof file is required' });
    }

    const submittedReference = sanitizeText(req.body && req.body.submitted_reference, 64).toUpperCase();
    const submittedAmountRaw = safeNumber(req.body && req.body.submitted_amount, NaN);
    const submittedAmount = Number.isFinite(submittedAmountRaw) ? roundCurrencyAmount(submittedAmountRaw) : NaN;
    const expectedReference = sanitizeText(aggregate.payment.bank_reference || aggregate.order.bank_reference, 64).toUpperCase();
    let matchScore = 0;

    if (submittedReference && expectedReference && submittedReference === expectedReference) {
        matchScore += 50;
    }
    if (Number.isFinite(submittedAmount) && amountsEqual(submittedAmount, aggregate.payment.total_final != null ? aggregate.payment.total_final : aggregate.payment.amount)) {
        matchScore += 50;
    }

    const relativeProofPath = path.relative(__dirname, req.file.path);
    const tx = db.transaction(() => {
        db.prepare(`
            INSERT INTO bank_transfer_submissions(
                payment_id, proof_path, submitted_reference, submitted_amount, match_score, review_status, reviewed_by, reviewed_at
            ) VALUES(?,?,?,?,?,?,?,?)
        `).run(
            aggregate.payment.id,
            relativeProofPath,
            submittedReference || null,
            Number.isFinite(submittedAmount) ? submittedAmount : null,
            matchScore,
            'pending',
            null,
            null
        );
        db.prepare(`
            INSERT INTO documents(order_id, document_type, storage_path, visibility)
            VALUES(?,?,?,?)
        `).run(aggregate.order.id, 'transfer_proof', relativeProofPath, 'private');
    });
    tx();

    persistPaymentPatch(aggregate.payment.id, {
        status: 'transfer_submitted',
        provider_status: 'proof_uploaded'
    });
    persistOrderPatch(aggregate.order.id, {
        status: 'transfer_submitted',
        provider_status: 'proof_uploaded'
    });
    logAudit(actorType, actorId, 'bank_transfer.proof_uploaded', 'order', aggregate.order.public_id, {
        matchScore,
        submittedReference: submittedReference || null
    });

    return res.json({
        status: 'ok',
        orderPublicId: aggregate.order.public_id,
        paymentId: aggregate.payment.id,
        matchScore
    });
}

app.post('/api/auth/customer/register', (req, res) => {
    const result = registerCustomerWithPassword(req.body);
    if (result.error) {
        return res.status(result.statusCode || 400).json({ error: result.error });
    }

    logAudit('guest', normalizeEmail(req.body && req.body.email), 'customer_auth.registered', 'customer_profile', result.profile.publicId, null);
    res.status(201).json(result);
});

app.post('/api/auth/customer/login', (req, res) => {
    const result = loginCustomerWithPassword(req.body);
    if (result.error) {
        return res.status(result.statusCode || 400).json({ error: result.error });
    }

    logAudit('guest', normalizeEmail(req.body && req.body.email), 'customer_auth.password_login', 'customer_profile', result.profile.publicId, null);
    res.json(result);
});

app.post('/api/auth/customer/google', async (req, res) => {
    try {
        const credential = req.body && req.body.credential;
        const result = await loginCustomerWithGoogleCredential(credential);
        logAudit('guest', result.profile.email, 'customer_auth.google_login', 'customer_profile', result.profile.publicId, null);
        res.json(result);
    } catch (error) {
        const message = error && error.message ? error.message : 'Google sign-in failed';
        res.status(401).json({ error: message });
    }
});

app.post('/api/auth/customer/request-code', (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    const fullName = sanitizeText(req.body && req.body.fullName, 180);
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (!CUSTOMER_AUTH_DEBUG) {
        return res.status(503).json({ error: 'Customer email delivery is not configured yet' });
    }

    const code = createCustomerAuthCode();
    const expiresAt = addMsToNow(CUSTOMER_AUTH_CODE_TTL_MS);
    const existingOrders = countGuestOrdersByEmail(email);

    db.prepare('DELETE FROM customer_auth_codes WHERE email = ? AND purpose = ?').run(email, 'login');
    db.prepare(`
        INSERT INTO customer_auth_codes(email, code_hash, purpose, expires_at)
        VALUES(?,?,?,?)
    `).run(email, hashSecret(code), 'login', expiresAt);

    if (fullName) {
        upsertCustomerProfile(email, fullName);
    }

    logAudit('guest', email, 'customer_auth.code_requested', 'customer_profile', email, {
        existingOrders
    });

    res.json({
        status: 'ok',
        email,
        expiresAt,
        existingOrders,
        debugCode: CUSTOMER_AUTH_DEBUG ? code : undefined
    });
});

app.post('/api/auth/customer/verify-code', (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    const code = sanitizeText(req.body && req.body.code, 12);
    const fullName = sanitizeText(req.body && req.body.fullName, 180);
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    const consumed = consumeCustomerAuthCode(email, code, 'login');
    if (!consumed) {
        return res.status(401).json({ error: 'Invalid or expired code' });
    }

    let profile = upsertCustomerProfile(email, fullName);
    profile = markCustomerEmailVerified(profile.public_id);
    const claimedOrderIds = claimOrdersForCustomer(profile, email, 'email_otp');
    profile = touchCustomerLastLogin(profile.public_id);
    const session = createCustomerSession(profile);

    logAudit('guest', email, 'customer_auth.verified', 'customer_profile', profile.public_id, {
        claimedOrders: claimedOrderIds.length
    });

    res.json({
        status: 'ok',
        token: session.token,
        expiresAt: session.expiresAt,
        profile: serializeCustomerProfile(profile),
        claimedOrders: claimedOrderIds,
        cart: loadCustomerCart(profile.public_id)
    });
});

app.post('/api/auth/customer/logout', requireCustomerAuth, (req, res) => {
    db.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').run(hashSecret(req.customerToken));
    logAudit('customer', req.customer.profilePublicId, 'customer_auth.logout', 'customer_profile', req.customer.profilePublicId, null);
    res.json({ status: 'ok' });
});

app.get('/api/me', requireCustomerAuth, (req, res) => {
    const orders = listOrdersForCustomer(req.customer.profilePublicId);
    res.json({
        status: 'ok',
        profile: serializeCustomerProfile(findCustomerProfileByPublicIdStmt.get(req.customer.profilePublicId)),
        session: {
            expiresAt: req.customer.expiresAt
        },
        ordersCount: orders.length,
        cart: loadCustomerCart(req.customer.profilePublicId)
    });
});

app.get('/api/me/cart', requireCustomerAuth, (req, res) => {
    res.json({
        status: 'ok',
        cart: loadCustomerCart(req.customer.profilePublicId),
        session: {
            expiresAt: req.customer.expiresAt
        }
    });
});

app.put('/api/me/cart', requireCustomerAuth, (req, res) => {
    const cart = saveCustomerCart(req.customer.profilePublicId, req.body && req.body.cart);
    res.json({
        status: 'ok',
        cart,
        session: {
            expiresAt: req.customer.expiresAt
        }
    });
});

app.get('/api/me/orders', requireCustomerAuth, (req, res) => {
    const rows = listOrdersForCustomer(req.customer.profilePublicId);
    res.json({
        status: 'ok',
        profile: serializeCustomerProfile(findCustomerProfileByPublicIdStmt.get(req.customer.profilePublicId)),
        session: {
            expiresAt: req.customer.expiresAt
        },
        orders: rows.map(serializeCustomerOrderSummary)
    });
});

app.get('/api/me/orders/:publicId', requireCustomerAuth, (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const aggregate = loadOrderAggregateForCustomer(req.customer.profilePublicId, publicId);
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
        status: 'ok',
        data: serializeCustomerPortalAggregate(aggregate),
        session: {
            expiresAt: req.customer.expiresAt
        }
    });
});

app.get('/api/me/orders/:publicId/documents/:documentId/download', requireCustomerAuth, (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const documentId = safeInt(req.params.documentId, NaN);
    if (!publicId || !Number.isFinite(documentId)) {
        return res.status(400).json({ error: 'Invalid document request' });
    }

    const aggregate = loadOrderAggregateForCustomer(req.customer.profilePublicId, publicId);
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }

    return downloadPrivateOrderDocument(aggregate.order, documentId, res);
});

app.post('/api/me/orders/:publicId/transfer-proof', requireCustomerAuth, uploadTransferProof.single('proof'), (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const aggregate = loadOrderAggregateForCustomer(req.customer.profilePublicId, publicId);
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }

    return handleTransferProofUpload(req, res, aggregate, 'customer', req.customer.profilePublicId);
});

app.post('/api/orders/lookup', (req, res) => {
    const publicId = sanitizeText(req.body && req.body.publicId, 64);
    const guestEmail = normalizeEmail(req.body && req.body.email);
    if (!publicId || !guestEmail) {
        return res.status(400).json({ error: 'publicId and email are required' });
    }

    const aggregate = loadOrderAggregateByPublicId(publicId);
    if (!aggregate || normalizeEmail(aggregate.order.guest_email) !== guestEmail) {
        return res.status(404).json({ error: 'Order not found for this email' });
    }

    const portalSession = createCustomerPortalSession(aggregate.order);
    logAudit('guest', guestEmail, 'order.portal_lookup', 'order', publicId, null);

    res.json({
        status: 'ok',
        portal: portalSession,
        data: serializeCustomerPortalAggregate(aggregate)
    });
});

app.get('/api/orders/:publicId/portal', requireCustomerPortal, (req, res) => {
    const aggregate = loadOrderAggregateByPublicId(sanitizeText(req.params.publicId, 64));
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
        status: 'ok',
        data: serializeCustomerPortalAggregate(aggregate),
        portal: {
            expiresAt: req.customerPortal.expiresAt
        }
    });
});

app.get('/api/orders/:publicId/documents/:documentId/download', requireCustomerPortal, (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const documentId = safeInt(req.params.documentId, NaN);
    if (!publicId || !Number.isFinite(documentId)) {
        return res.status(400).json({ error: 'Invalid document request' });
    }

    const order = findOrderByPublicIdStmt.get(publicId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    return downloadPrivateOrderDocument(order, documentId, res);
});

app.post('/api/orders/:publicId/transfer-proof', requireCustomerPortal, uploadTransferProof.single('proof'), (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const aggregate = loadOrderAggregateByPublicId(publicId);
    return handleTransferProofUpload(req, res, aggregate, 'guest', aggregate && aggregate.order ? aggregate.order.guest_email : 'guest');
});

// POST booking
app.post('/api/bookings', (req, res) => {
    const payload = normalizeCheckoutPayload(req.body, 'manual_contact');
    const validationError = validateCheckoutPayload(payload, { requireTotal: true });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const computed = computeServerCartTotals(payload.cart);
    if (computed.error) return res.status(400).json({ error: computed.error });
    if (!amountsEqual(payload.total, computePaymentBreakdown(computed.totalUSD, payload.paymentMethod).totalFinal)) {
        return res.status(400).json({ error: 'Total mismatch. Refresh your cart and try again.' });
    }

    const stmt = db.prepare(`
        INSERT INTO bookings(
            customer_name, customer_email, customer_phone, tour_date, pickup_time, hotel, comments, cart_json, total_usd, status
        ) VALUES(?,?,?,?,?,?,?,?,?,?)
    `);
    const r = stmt.run(
        payload.guestName,
        payload.guestEmail,
        payload.guestPhone,
        payload.serviceDate,
        payload.pickupTime || '',
        payload.hotel || '',
        payload.comments || '',
        JSON.stringify(computed.normalizedCart),
        computed.totalUSD,
        'pending'
    );

    const orderResult = createOrderRecord({
        ...payload,
        paymentMethod: 'manual_contact',
        source: 'legacy_booking'
    });
    if (orderResult.error) {
        return res.status(500).json({ error: orderResult.error });
    }

    res.json({
        id: r.lastInsertRowid,
        status: 'ok',
        orderPublicId: orderResult.publicId
    });
});

// GET bookings (admin, summary without raw PII)
app.get('/api/bookings', requireAdmin, (req, res) => {
    const rows = db.prepare(`
        SELECT id, customer_name, customer_email, customer_phone, tour_date, pickup_time, hotel, comments, cart_json, total_usd, status, created_at
        FROM bookings
        ORDER BY created_at DESC
    `).all();

    const safeRows = rows.map((row) => {
        let itemsCount = 0;
        try {
            const parsed = JSON.parse(row.cart_json || '[]');
            itemsCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch (_) {
            itemsCount = 0;
        }

        return {
            id: row.id,
            customer_name: sanitizeText(row.customer_name, 180),
            customer_email_masked: maskEmail(row.customer_email),
            customer_phone_masked: maskPhone(row.customer_phone),
            tour_date: row.tour_date,
            pickup_time: row.pickup_time,
            hotel_provided: Boolean(row.hotel),
            comments_provided: Boolean(row.comments),
            items_count: itemsCount,
            total_usd: row.total_usd,
            status: row.status,
            created_at: row.created_at
        };
    });

    res.json(safeRows);
});

// Optional full booking detail by id (admin only)
app.get('/api/bookings/:id', requireAdmin, (req, res) => {
    const id = safeInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid booking id' });

    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Booking not found' });

    let cart = [];
    try {
        cart = JSON.parse(row.cart_json || '[]');
    } catch (_) {
        cart = [];
    }

    res.json({
        id: row.id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        tour_date: row.tour_date,
        pickup_time: row.pickup_time,
        hotel: row.hotel,
        comments: row.comments,
        cart,
        total_usd: row.total_usd,
        status: row.status,
        created_at: row.created_at
    });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const rows = db.prepare(`
        SELECT
            o.public_id,
            o.guest_name,
            o.guest_email,
            o.guest_phone,
            o.currency,
            o.total,
            o.subtotal,
            o.fee_percent,
            o.fee_amount,
            o.total_final,
            o.status,
            o.payment_method,
            o.provider_status,
            o.expires_at,
            o.service_date,
            o.created_at,
            p.id AS payment_id,
            p.status AS payment_status,
            p.intent AS payment_intent
        FROM orders o
        LEFT JOIN payments p ON p.id = (
            SELECT id FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.id DESC LIMIT 1
        )
        ORDER BY o.created_at DESC
    `).all();

    res.json(rows.map((row) => ({
        public_id: row.public_id,
        guest_name: sanitizeText(row.guest_name, 180),
        guest_email_masked: maskEmail(row.guest_email),
        guest_phone_masked: maskPhone(row.guest_phone),
        currency: row.currency,
        subtotal: roundCurrencyAmount(row.subtotal),
        fee_percent: roundCurrencyAmount(row.fee_percent),
        fee_amount: roundCurrencyAmount(row.fee_amount),
        total: roundCurrencyAmount(row.total_final != null ? row.total_final : row.total),
        total_final: roundCurrencyAmount(row.total_final != null ? row.total_final : row.total),
        status: row.status,
        payment_method: row.payment_method,
        provider_status: row.provider_status,
        expires_at: row.expires_at,
        service_date: row.service_date,
        created_at: row.created_at,
        payment_id: row.payment_id,
        payment_status: row.payment_status,
        payment_intent: row.payment_intent
    })));
});

app.get('/api/admin/orders/:publicId', requireAdmin, (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const aggregate = loadOrderAggregateByPublicId(publicId);
    if (!aggregate) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const transferSubmissions = aggregate.payment
        ? db.prepare('SELECT * FROM bank_transfer_submissions WHERE payment_id = ? ORDER BY created_at DESC').all(aggregate.payment.id)
        : [];
    const documents = db.prepare('SELECT * FROM documents WHERE order_id = ? ORDER BY created_at DESC').all(aggregate.order.id);

    res.json({
        order: aggregate.order,
        items: aggregate.items.map((item) => ({
            ...item,
            add_ons: parseJsonSafely(item.add_ons_json || '[]', [])
        })),
        payment: aggregate.payment,
        bankTransfer: aggregate.order.payment_method === 'bank_transfer' ? {
            bankName: BANK_TRANSFER_BANK_NAME || null,
            beneficiary: BANK_TRANSFER_BENEFICIARY || null,
            clabe: BANK_TRANSFER_CLABE || null,
            account: BANK_TRANSFER_ACCOUNT || null,
            cardNumber: BANK_TRANSFER_CARD_NUMBER || null,
            swift: BANK_TRANSFER_SWIFT || null,
            reference: aggregate.order.bank_reference || null,
            expiresAt: aggregate.order.expires_at || null
        } : null,
        transferSubmissions,
        documents
    });
});

app.get('/api/admin/orders/:publicId/documents/:documentId/download', requireAdmin, (req, res) => {
    const publicId = sanitizeText(req.params.publicId, 64);
    const documentId = safeInt(req.params.documentId, NaN);
    if (!publicId || !Number.isFinite(documentId)) {
        return res.status(400).json({ error: 'Invalid document request' });
    }

    const order = findOrderByPublicIdStmt.get(publicId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const document = db.prepare('SELECT * FROM documents WHERE id = ? AND order_id = ? LIMIT 1').get(documentId, order.id);
    if (!document) {
        return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = resolvePrivatePath(document.storage_path);
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Stored document not found' });
    }

    res.download(filePath);
});

app.post('/api/admin/payments/:id/capture', requireAdmin, async (req, res) => {
    const paymentId = safeInt(req.params.id, NaN);
    if (!Number.isFinite(paymentId)) {
        return res.status(400).json({ error: 'Invalid payment id' });
    }

    const payment = findPaymentByIdStmt.get(paymentId);
    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.provider !== 'paypal' || payment.intent !== 'AUTHORIZE' || !payment.paypal_authorization_id) {
        return res.status(400).json({ error: 'Payment is not a capturable PayPal authorization' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    try {
        const paypalResult = await callPayPalApi(`/v2/payments/authorizations/${payment.paypal_authorization_id}/capture`, {
            method: 'POST',
            headers: {
                Prefer: 'return=representation',
                'PayPal-Request-Id': `${order.public_id}-admin-capture-${payment.id}`
            },
            body: {}
        });
        const providerStatus = sanitizeText(paypalResult.status, 40) || 'COMPLETED';
        const paid = providerStatus === 'COMPLETED';

        syncOrderAndPaymentFromPayPal(payment, {
            payment: {
                status: paid ? 'paid' : 'pending_review',
                provider_status: providerStatus,
                paypal_capture_id: sanitizeText(paypalResult.id, 64),
                seller_protection_status: sanitizeText(paypalResult.seller_protection && paypalResult.seller_protection.status, 40),
                paid_at: paid ? nowAsSqlDateTime() : null,
                metadata_json: paypalResult
            },
            order: {
                status: paid ? 'paid' : 'payment_pending',
                provider_status: providerStatus
            }
        });

        logAudit('admin', req.admin.username, 'paypal.authorization_captured', 'payment', payment.id, {
            orderPublicId: order.public_id,
            authorizationId: payment.paypal_authorization_id
        });

        const refreshed = findPaymentByIdStmt.get(paymentId);
        res.json({ status: 'ok', payment: refreshed });
    } catch (error) {
        console.error('Admin PayPal capture error:', error);
        res.status(502).json({ error: error.message || 'PayPal capture failed' });
    }
});

app.post('/api/admin/payments/:id/confirm-transfer', requireAdmin, (req, res) => {
    const paymentId = safeInt(req.params.id, NaN);
    if (!Number.isFinite(paymentId)) {
        return res.status(400).json({ error: 'Invalid payment id' });
    }

    const payment = findPaymentByIdStmt.get(paymentId);
    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.provider !== 'bank_transfer') {
        return res.status(400).json({ error: 'Payment is not a bank transfer' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const now = nowAsSqlDateTime();
    const tx = db.transaction(() => {
        persistPaymentPatch(payment.id, {
            status: 'paid',
            provider_status: 'bank_reconciled',
            paid_at: now
        });
        persistOrderPatch(order.id, {
            status: 'paid',
            provider_status: 'bank_reconciled'
        });
        db.prepare(`
            UPDATE bank_transfer_submissions
            SET review_status = ?, reviewed_by = ?, reviewed_at = ?
            WHERE id = (
                SELECT id FROM bank_transfer_submissions
                WHERE payment_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            )
        `).run('confirmed', req.admin.username, now, payment.id);
    });
    tx();

    logAudit('admin', req.admin.username, 'bank_transfer.confirmed', 'payment', payment.id, {
        orderPublicId: order.public_id
    });

    res.json({ status: 'ok', payment: findPaymentByIdStmt.get(payment.id) });
});

// Config endpoint
app.get('/api/config', (req, res) => {
    res.json({
        emailjs: {
            publicKey: 'adpBU-SgpefU02llA',
            serviceId: 'lindo_Tours',
            templateId: 'template_ms3160x'
        },
        whatsapp: {
            phone: WHATSAPP_PHONE,
            url: buildWhatsAppUrl(WHATSAPP_PHONE)
        },
        contact: {
            email: CONTACT_EMAIL,
            phone: WHATSAPP_PHONE,
            phoneDisplay: formatPhoneDisplay(WHATSAPP_PHONE),
            whatsappUrl: buildWhatsAppUrl(WHATSAPP_PHONE)
        },
        demoMode: {
            enabled: DEMO_MODE,
            paypalUrl: DEMO_PAYPAL_URL || null
        },
        auth: {
            customer: {
                enabled: true,
                passwordEnabled: true,
                googleEnabled: Boolean(GOOGLE_PRIMARY_CLIENT_ID),
                googleClientId: GOOGLE_PRIMARY_CLIENT_ID || null,
                debugOtp: CUSTOMER_AUTH_DEBUG,
                codeTtlMs: CUSTOMER_AUTH_CODE_TTL_MS,
                sessionTtlMs: CUSTOMER_SESSION_TTL_MS
            }
        },
        payments: {
            currency: ORDER_CURRENCY,
            paypal: {
                enabled: hasPayPalConfig(),
                clientId: PAYPAL_CLIENT_ID || null,
                accountEmail: PAYPAL_ACCOUNT_EMAIL || null,
                feePercent: PAYPAL_FEE_PERCENT
            },
            bankTransfer: {
                enabled: hasBankTransferConfig(),
                bankName: BANK_TRANSFER_BANK_NAME || null,
                beneficiary: BANK_TRANSFER_BENEFICIARY || null,
                clabe: BANK_TRANSFER_CLABE || null,
                account: BANK_TRANSFER_ACCOUNT || null,
                cardNumber: BANK_TRANSFER_CARD_NUMBER || null,
                swift: BANK_TRANSFER_SWIFT || null,
                referencePrefix: BANK_TRANSFER_REFERENCE_PREFIX,
                feePercent: BANK_TRANSFER_FEE_PERCENT
            }
        }
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err && err.message && (
        err.message.includes('JPG/JPEG')
        || err.message.includes('transfer proofs')
        || err.message.includes('PNG')
        || err.message.includes('PDF')
    )) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

app.get('/login', (req, res) => {
    res.redirect('/?auth=login');
});

app.get('/register', (req, res) => {
    res.redirect('/?auth=register');
});

app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
    const listenPort = port || PORT;
    const server = app.listen(listenPort, () => {
        const address = server.address();
        const boundPort = address && typeof address === 'object' ? address.port : listenPort;
        console.log(`Lindo Tours running on http://localhost:${boundPort}`);
    });
    return server;
}

if (require.main === module) {
    startServer(PORT);
}

module.exports = {
    app,
    db,
    startServer,
    SQLITE_DB_PATH,
    PRIVATE_STORAGE_PATH
};
