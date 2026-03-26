const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const projectRoot = path.resolve(__dirname, '..');
const selectedScenario = process.argv[2] || 'all';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lindotours-smoke-'));
const originalFetch = global.fetch;
let paypalMock;
let db;
let startServer;

setupEnvironment(tempRoot);

const scenarios = {
    orders: runOrdersScenario,
    'customer-auth': runCustomerAuthScenario,
    'bank-transfer': runBankTransferScenario,
    admin: runAdminScenario,
    paypal: runPayPalScenario
};

async function main() {
    paypalMock = new PayPalMock(process.env.PAYPAL_API_BASE, originalFetch);
    global.fetch = paypalMock.fetch.bind(paypalMock);
    ({ startServer, db } = require(path.join(projectRoot, 'server.js')));

    const names = selectedScenario === 'all'
        ? Object.keys(scenarios)
        : [selectedScenario];

    for (const name of names) {
        if (!scenarios[name]) {
            throw new Error(`Unknown scenario "${name}"`);
        }
    }

    const server = startServer(0);
    await once(server, 'listening');
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const ctx = await createContext(baseUrl, paypalMock);

    try {
        for (const name of names) {
            await scenarios[name](ctx);
            console.log(`ok - ${name}`);
        }
    } finally {
        await closeServer(server);
    }
}

function setupEnvironment(rootDir) {
    const dataDir = path.join(rootDir, 'data');
    const storageDir = path.join(rootDir, 'storage');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(storageDir, { recursive: true });

    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.SQLITE_DB_PATH = path.join(dataDir, 'smoke.db');
    process.env.PRIVATE_STORAGE_PATH = storageDir;
    process.env.ADMIN_USERNAME = 'smoke-admin';
    process.env.ADMIN_PASSWORD = 'smoke-password';
    process.env.ADMIN_TOKEN_TTL_MS = '28800000';
    process.env.CUSTOMER_AUTH_DEBUG = 'true';
    process.env.CUSTOMER_AUTH_CODE_TTL_MS = '600000';
    process.env.CUSTOMER_SESSION_TTL_MS = '604800000';
    process.env.CUSTOMER_PORTAL_TOKEN_TTL_MS = '1800000';
    process.env.GOOGLE_CLIENT_ID = 'smoke-google-client-id';
    process.env.DEMO_MODE = 'false';
    process.env.PAYPAL_CLIENT_ID = 'smoke-client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'smoke-client-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'smoke-webhook-id';
    process.env.PAYPAL_API_BASE = 'https://paypal-smoke.local';
    process.env.BANK_TRANSFER_BANK_NAME = 'Smoke Bank';
    process.env.BANK_TRANSFER_BENEFICIARY = 'Smoke Beneficiary';
    process.env.BANK_TRANSFER_CLABE = '012345678901234567';
    process.env.BANK_TRANSFER_ACCOUNT = '1234567890';
    process.env.BANK_TRANSFER_CARD_NUMBER = '4111111111111111';
    process.env.BANK_TRANSFER_SWIFT = 'SMOKEMX1';
    process.env.BANK_TRANSFER_REFERENCE_PREFIX = 'SMK';
    process.env.PAYPAL_FEE_PERCENT = '5';
    process.env.BANK_TRANSFER_FEE_PERCENT = '0';
}

async function createContext(baseUrl, paypal) {
    const tours = await getJson(baseUrl, '/api/tours');
    const hotels = await getJson(baseUrl, '/api/hotels');
    assert.ok(Array.isArray(tours) && tours.length > 0, 'Expected seeded tours');
    assert.ok(Array.isArray(hotels) && hotels.length > 0, 'Expected seeded hotels');

    const regularTour = tours.find((tour) => !isPrivateTour(tour.id) && hasPricing(tour));
    const privateTour = tours.find((tour) => isPrivateTour(tour.id) && hasPricing(tour));

    assert.ok(regularTour, 'Expected a non-private seeded tour');
    assert.ok(privateTour, 'Expected a private seeded tour');

    return {
        baseUrl,
        paypal,
        tours,
        hotels,
        regularTour,
        privateTour,
        defaultHotel: hotels[0].n || hotels[0].name || 'Smoke Hotel'
    };
}

async function runOrdersScenario(ctx) {
    const email = uniqueEmail('orders');
    const created = await createCheckoutOrder(ctx, {
        email,
        paymentMethod: 'manual_contact',
        tour: ctx.regularTour
    });

    assert.equal(created.order.status, 'pending_review');
    assert.equal(created.order.paymentMethod, 'manual_contact');

    const lookup = await postJson(ctx.baseUrl, '/api/orders/lookup', {
        publicId: created.order.publicId,
        email
    });

    assert.equal(lookup.status, 'ok');
    assert.equal(lookup.data.order.publicId, created.order.publicId);
    assert.equal(lookup.data.order.status, 'pending_review');
    assert.equal(lookup.data.items.length, 1);

    const portal = await getJson(ctx.baseUrl, `/api/orders/${created.order.publicId}/portal`, {
        headers: {
            Authorization: `Bearer ${lookup.portal.token}`
        }
    });

    assert.equal(portal.status, 'ok');
    assert.equal(portal.data.order.publicId, created.order.publicId);
}

async function runCustomerAuthScenario(ctx) {
    const email = uniqueEmail('auth');
    const created = await createCheckoutOrder(ctx, {
        email,
        paymentMethod: 'manual_contact',
        tour: ctx.regularTour
    });

    const registered = await postJson(ctx.baseUrl, '/api/auth/customer/register', {
        email,
        fullName: 'Smoke Customer',
        password: 'smoke-password-123'
    }, {
        expectedStatus: 201
    });

    assert.equal(registered.status, 'ok');
    assert.ok(Array.isArray(registered.claimedOrders));
    assert.ok(registered.claimedOrders.includes(created.order.publicId));
    assert.equal(registered.profile.email, email);

    const authHeaders = {
        Authorization: `Bearer ${registered.token}`
    };
    const me = await getJson(ctx.baseUrl, '/api/me', { headers: authHeaders });
    assert.equal(me.status, 'ok');
    assert.ok(me.ordersCount >= 1);

    const storedCart = await putJson(ctx.baseUrl, '/api/me/cart', {
        cart: [{
            id: 'persisted-cart-item',
            tourId: ctx.regularTour.id,
            name: 'Persisted cart item',
            image: '/imagenes/test.jpg',
            adults: 2,
            children: 0,
            addOns: [],
            subtotalUSD: 100
        }]
    }, { headers: authHeaders });
    assert.equal(storedCart.status, 'ok');
    assert.equal(storedCart.cart.length, 1);

    const restoredCart = await getJson(ctx.baseUrl, '/api/me/cart', { headers: authHeaders });
    assert.equal(restoredCart.status, 'ok');
    assert.equal(restoredCart.cart.length, 1);

    const orders = await getJson(ctx.baseUrl, '/api/me/orders', { headers: authHeaders });
    assert.equal(orders.status, 'ok');
    assert.ok(orders.orders.some((order) => order.publicId === created.order.publicId));

    const detail = await getJson(ctx.baseUrl, `/api/me/orders/${created.order.publicId}`, { headers: authHeaders });
    assert.equal(detail.status, 'ok');
    assert.equal(detail.data.order.publicId, created.order.publicId);

    const logout = await postJson(ctx.baseUrl, '/api/auth/customer/logout', null, { headers: authHeaders });
    assert.equal(logout.status, 'ok');

    const passwordLogin = await postJson(ctx.baseUrl, '/api/auth/customer/login', {
        email,
        password: 'smoke-password-123'
    });
    assert.equal(passwordLogin.status, 'ok');
    assert.equal(passwordLogin.cart.length, 1);

    const secondGuestOrder = await createCheckoutOrder(ctx, {
        email,
        paymentMethod: 'manual_contact',
        tour: ctx.privateTour
    });

    const googleLogin = await postJson(ctx.baseUrl, '/api/auth/customer/google', {
        credential: ctx.paypal.createGoogleIdToken({
            email,
            name: 'Smoke Customer'
        })
    });
    assert.equal(googleLogin.status, 'ok');
    assert.ok(googleLogin.claimedOrders.includes(secondGuestOrder.order.publicId));
    assert.equal(googleLogin.cart.length, 1);

    const googleHeaders = {
        Authorization: `Bearer ${googleLogin.token}`
    };
    const googleMe = await getJson(ctx.baseUrl, '/api/me', { headers: googleHeaders });
    assert.equal(googleMe.status, 'ok');
    assert.equal(googleMe.cart.length, 1);
    assert.ok(googleMe.ordersCount >= 2);
}

async function runBankTransferScenario(ctx) {
    const email = uniqueEmail('transfer');
    const created = await createCheckoutOrder(ctx, {
        email,
        paymentMethod: 'bank_transfer',
        tour: ctx.regularTour
    });

    assert.equal(created.order.status, 'awaiting_transfer');
    assert.ok(created.payment);
    assert.ok(created.bankTransfer);
    assert.equal(created.bankTransfer.cardNumber, process.env.BANK_TRANSFER_CARD_NUMBER);

    const form = new FormData();
    form.append('submitted_reference', created.bankTransfer.reference);
    form.append('submitted_amount', String(created.order.total));
    form.append('proof', new Blob([Buffer.from('smoke-transfer-proof')], {
        type: 'application/pdf'
    }), 'proof.pdf');

    const upload = await fetch(`${ctx.baseUrl}/api/orders/${created.order.publicId}/transfer-proof`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${created.portal.token}`
        },
        body: form
    });
    const uploadBody = await parseResponse(upload);

    assert.equal(upload.status, 200, formatFailure('transfer-proof upload', upload.status, uploadBody));
    assert.equal(uploadBody.status, 'ok');
    assert.equal(uploadBody.matchScore, 100);

    const adminToken = await loginAdmin(ctx.baseUrl);
    const adminDetail = await getJson(ctx.baseUrl, `/api/admin/orders/${created.order.publicId}`, {
        headers: {
            Authorization: `Bearer ${adminToken}`
        }
    });

    assert.ok(Array.isArray(adminDetail.transferSubmissions));
    assert.equal(adminDetail.transferSubmissions.length, 1);

    const confirm = await postJson(ctx.baseUrl, `/api/admin/payments/${created.payment.id}/confirm-transfer`, null, {
        headers: {
            Authorization: `Bearer ${adminToken}`
        }
    });

    assert.equal(confirm.status, 'ok');
    assert.equal(confirm.payment.status, 'paid');

    const portal = await getJson(ctx.baseUrl, `/api/orders/${created.order.publicId}/portal`, {
        headers: {
            Authorization: `Bearer ${created.portal.token}`
        }
    });

    assert.equal(portal.data.order.status, 'paid');
    assert.equal(portal.data.payment.status, 'paid');
}

async function runAdminScenario(ctx) {
    const created = await createCheckoutOrder(ctx, {
        email: uniqueEmail('admin'),
        paymentMethod: 'manual_contact',
        tour: ctx.regularTour
    });

    const token = await loginAdmin(ctx.baseUrl);

    const session = await getJson(ctx.baseUrl, '/api/admin/session', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.equal(session.status, 'ok');
    assert.equal(session.username, process.env.ADMIN_USERNAME);

    const orders = await getJson(ctx.baseUrl, '/api/admin/orders', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.ok(Array.isArray(orders));
    assert.ok(orders.some((order) => order.public_id === created.order.publicId));
}

async function runPayPalScenario(ctx) {
    const adminToken = await loginAdmin(ctx.baseUrl);

    const paid = await createCheckoutOrder(ctx, {
        email: uniqueEmail('paypal-paid'),
        paymentMethod: 'paypal',
        tour: ctx.regularTour
    });
    const paidPayPal = await createPayPalOrder(ctx.baseUrl, paid.order.publicId);
    const paidFinalize = await postJson(ctx.baseUrl, '/api/payments/paypal/finalize', {
        orderPublicId: paid.order.publicId,
        paypalOrderId: paidPayPal.paypalOrderId
    });

    assert.equal(paidFinalize.order.status, 'paid');
    assert.equal(paidFinalize.payment.status, 'paid');

    const paidWebhook = buildPayPalWebhook('PAYMENT.CAPTURE.COMPLETED', {
        eventId: `WH-${Date.now()}-paid`,
        resourceId: paidFinalize.payment.paypalCaptureId,
        resourceStatus: 'COMPLETED',
        paypalOrderId: paidFinalize.payment.paypalOrderId
    });
    const paidWebhookResponse = await sendPayPalWebhook(ctx.baseUrl, paidWebhook);
    assert.equal(paidWebhookResponse.status, 'ok');

    const authorized = await createCheckoutOrder(ctx, {
        email: uniqueEmail('paypal-auth'),
        paymentMethod: 'paypal',
        tour: ctx.privateTour
    });
    const authorizedPayPal = await createPayPalOrder(ctx.baseUrl, authorized.order.publicId);
    const authorizedFinalize = await postJson(ctx.baseUrl, '/api/payments/paypal/finalize', {
        orderPublicId: authorized.order.publicId,
        paypalOrderId: authorizedPayPal.paypalOrderId
    });

    assert.equal(authorizedFinalize.order.status, 'payment_authorized');
    assert.equal(authorizedFinalize.payment.status, 'authorized');

    const authorizationWebhook = buildPayPalWebhook('PAYMENT.AUTHORIZATION.CREATED', {
        eventId: `WH-${Date.now()}-authorized`,
        resourceId: authorizedFinalize.payment.paypalAuthorizationId,
        resourceStatus: 'AUTHORIZED',
        paypalOrderId: authorizedFinalize.payment.paypalOrderId
    });
    const authorizedWebhookResponse = await sendPayPalWebhook(ctx.baseUrl, authorizationWebhook);
    assert.equal(authorizedWebhookResponse.status, 'ok');

    const adminCapture = await postJson(
        ctx.baseUrl,
        `/api/admin/payments/${authorizedFinalize.payment.id}/capture`,
        null,
        {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        }
    );
    assert.equal(adminCapture.status, 'ok');
    assert.equal(adminCapture.payment.status, 'paid');

    const pending = await createCheckoutOrder(ctx, {
        email: uniqueEmail('paypal-pending'),
        paymentMethod: 'paypal',
        tour: ctx.regularTour
    });
    ctx.paypal.setOutcome(pending.order.publicId, { captureStatus: 'PENDING' });
    const pendingPayPal = await createPayPalOrder(ctx.baseUrl, pending.order.publicId);
    const pendingFinalize = await postJson(ctx.baseUrl, '/api/payments/paypal/finalize', {
        orderPublicId: pending.order.publicId,
        paypalOrderId: pendingPayPal.paypalOrderId
    });

    assert.equal(pendingFinalize.order.status, 'payment_pending');
    assert.equal(pendingFinalize.payment.status, 'pending_review');

    const pendingWebhook = buildPayPalWebhook('PAYMENT.CAPTURE.PENDING', {
        eventId: `WH-${Date.now()}-pending`,
        resourceId: pendingFinalize.payment.paypalCaptureId,
        resourceStatus: 'PENDING',
        paypalOrderId: pendingFinalize.payment.paypalOrderId
    });
    const pendingWebhookResponse = await sendPayPalWebhook(ctx.baseUrl, pendingWebhook);
    assert.equal(pendingWebhookResponse.status, 'ok');

    const cancelled = await createCheckoutOrder(ctx, {
        email: uniqueEmail('paypal-cancelled'),
        paymentMethod: 'paypal',
        tour: ctx.regularTour
    });
    const cancelledPayPal = await createPayPalOrder(ctx.baseUrl, cancelled.order.publicId);
    const cancelResponse = await postJson(ctx.baseUrl, '/api/payments/paypal/cancel', {
        orderPublicId: cancelled.order.publicId,
        paypalOrderId: cancelledPayPal.paypalOrderId
    });

    assert.equal(cancelResponse.order.status, 'payment_cancelled');
    assert.equal(cancelResponse.payment.status, 'cancelled');
}

async function createCheckoutOrder(ctx, options) {
    const tour = options.tour;
    const tier = pickTier(tour);
    const cart = [{
        tourId: tour.id,
        adults: tier.adults,
        children: 0,
        addOns: []
    }];

    const quote = await postJson(ctx.baseUrl, '/api/orders/quote', {
        cart,
        paymentMethod: options.paymentMethod,
        currency: 'USD'
    });
    const expectedSubtotal = tier.adults * tier.adultPrice;
    const expectedFeePercent = options.paymentMethod === 'paypal' ? Number(process.env.PAYPAL_FEE_PERCENT) : 0;
    const expectedFeeAmount = roundMoney(quote.subtotal * (expectedFeePercent / 100));

    assert.equal(quote.subtotal, expectedSubtotal);
    assert.equal(quote.feePercent, expectedFeePercent);
    assert.equal(quote.feeAmount, expectedFeeAmount);
    assert.equal(quote.totalFinal, roundMoney(quote.subtotal + quote.feeAmount));
    assert.equal(quote.total, quote.totalFinal);

    const body = {
        guestName: 'Smoke Test',
        guestEmail: options.email,
        guestPhone: '+529981112233',
        serviceDate: '2026-06-15',
        pickupTime: '09:00',
        hotel: ctx.defaultHotel,
        comments: 'smoke',
        cart,
        total: quote.total,
        currency: 'USD',
        paymentMethod: options.paymentMethod,
        source: 'smoke'
    };

    const created = await postJson(ctx.baseUrl, '/api/orders', body);
    assert.equal(created.order.subtotal, quote.subtotal);
    assert.equal(created.order.feePercent, quote.feePercent);
    assert.equal(created.order.feeAmount, quote.feeAmount);
    assert.equal(created.order.totalFinal, quote.totalFinal);
    assert.equal(created.order.total, quote.totalFinal);
    if (created.payment) {
        assert.equal(created.payment.subtotal, quote.subtotal);
        assert.equal(created.payment.feePercent, quote.feePercent);
        assert.equal(created.payment.feeAmount, quote.feeAmount);
        assert.equal(created.payment.totalFinal, quote.totalFinal);
        assert.equal(created.payment.amount, quote.totalFinal);
    }

    return created;
}

async function createPayPalOrder(baseUrl, orderPublicId) {
    return postJson(baseUrl, '/api/payments/paypal/create-order', {
        orderPublicId,
        returnUrl: `${baseUrl}/?paypal_return=1&order_public_id=${encodeURIComponent(orderPublicId)}`,
        cancelUrl: `${baseUrl}/?paypal_cancel=1&order_public_id=${encodeURIComponent(orderPublicId)}`
    });
}

async function loginAdmin(baseUrl) {
    const login = await postJson(baseUrl, '/api/admin/login', {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD
    });
    assert.equal(login.status, 'ok');
    assert.ok(login.token);
    return login.token;
}

async function sendPayPalWebhook(baseUrl, event) {
    const response = await fetch(`${baseUrl}/api/webhooks/paypal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'PayPal-Auth-Algo': 'SHA256withRSA',
            'PayPal-Cert-Url': 'https://paypal-smoke.local/cert',
            'PayPal-Transmission-Id': `tx-${event.id}`,
            'PayPal-Transmission-Sig': 'smoke-signature',
            'PayPal-Transmission-Time': '2026-03-11T00:00:00Z'
        },
        body: JSON.stringify(event)
    });
    const body = await parseResponse(response);
    assert.equal(response.status, 200, formatFailure('paypal webhook', response.status, body));
    return body;
}

async function getJson(baseUrl, pathname, options) {
    const response = await fetch(`${baseUrl}${pathname}`, options);
    const body = await parseResponse(response);
    assert.equal(response.status, 200, formatFailure(`GET ${pathname}`, response.status, body));
    return body;
}

async function postJson(baseUrl, pathname, payload, options) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(options && options.headers ? options.headers : {})
        },
        body: payload == null ? undefined : JSON.stringify(payload)
    });
    const body = await parseResponse(response);
    const expectedStatus = options && options.expectedStatus ? options.expectedStatus : 200;
    assert.equal(response.status, expectedStatus, formatFailure(`POST ${pathname}`, response.status, body));
    return body;
}

async function putJson(baseUrl, pathname, payload, options) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(options && options.headers ? options.headers : {})
        },
        body: payload == null ? undefined : JSON.stringify(payload)
    });
    const body = await parseResponse(response);
    const expectedStatus = options && options.expectedStatus ? options.expectedStatus : 200;
    assert.equal(response.status, expectedStatus, formatFailure(`PUT ${pathname}`, response.status, body));
    return body;
}

async function parseResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (_) {
        return text;
    }
}

function formatFailure(label, status, body) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return `${label} failed with ${status}: ${payload}`;
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function uniqueEmail(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
}

function hasPricing(tour) {
    return Boolean(tour && tour.pricing && Array.isArray(tour.pricing.tiers) && tour.pricing.tiers.length > 0);
}

function isPrivateTour(slug) {
    return /private|privado/.test(String(slug || '').toLowerCase());
}

function pickTier(tour) {
    const tiers = Array.isArray(tour && tour.pricing && tour.pricing.tiers)
        ? [...tour.pricing.tiers].sort((a, b) => a.adults - b.adults)
        : [];
    assert.ok(tiers.length > 0, `Expected pricing tiers for ${tour && tour.id}`);
    return tiers[0];
}

function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function buildPayPalWebhook(eventType, details) {
    const relatedIds = {};
    if (details.paypalOrderId) {
        relatedIds.order_id = details.paypalOrderId;
    }
    if (details.authorizationId) {
        relatedIds.authorization_id = details.authorizationId;
    }

    return {
        id: details.eventId,
        event_type: eventType,
        resource: {
            id: details.resourceId,
            status: details.resourceStatus,
            create_time: '2026-03-11T00:00:00Z',
            supplementary_data: {
                related_ids: relatedIds
            },
            seller_protection: {
                status: 'ELIGIBLE'
            }
        }
    };
}

function PayPalMock(baseUrl, delegateFetch) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.delegateFetch = delegateFetch;
    this.orderCounter = 1;
    this.captureCounter = 1;
    this.authorizationCounter = 1;
    this.ordersByPayPalId = new Map();
    this.outcomesByPublicId = new Map();
    this.authorizationsById = new Map();
    const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    this.googlePrivateKey = keyPair.privateKey;
    this.googleJwk = keyPair.publicKey.export({ format: 'jwk' });
    this.googleJwk.kid = 'smoke-google-kid';
    this.googleJwk.use = 'sig';
    this.googleJwk.alg = 'RS256';
}

PayPalMock.prototype.setOutcome = function setOutcome(publicId, outcome) {
    this.outcomesByPublicId.set(publicId, {
        ...(this.outcomesByPublicId.get(publicId) || {}),
        ...(outcome || {})
    });
};

PayPalMock.prototype.createGoogleIdToken = function createGoogleIdToken(overrides) {
    const claims = overrides || {};
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = encodeBase64UrlJson({
        alg: 'RS256',
        typ: 'JWT',
        kid: this.googleJwk.kid
    });
    const payload = encodeBase64UrlJson({
        iss: 'https://accounts.google.com',
        aud: process.env.GOOGLE_CLIENT_ID,
        sub: claims.sub || `google-${Date.now()}`,
        email: claims.email,
        email_verified: true,
        name: claims.name || 'Smoke Google User',
        picture: claims.picture || 'https://example.com/avatar.png',
        iat: issuedAt,
        exp: issuedAt + 3600
    });
    const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), this.googlePrivateKey)
        .toString('base64url');
    return `${header}.${payload}.${signature}`;
};

PayPalMock.prototype.fetch = async function fetchWithMock(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (String(url) === 'https://www.googleapis.com/oauth2/v3/certs') {
        return new Response(JSON.stringify({
            keys: [this.googleJwk]
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    }
    if (!String(url).startsWith(this.baseUrl)) {
        return this.delegateFetch(input, init);
    }

    const parsedUrl = new URL(url);
    const body = await readJsonBody(init && init.body);
    const pathname = parsedUrl.pathname;

    if (pathname === '/v1/oauth2/token') {
        return jsonResponse({
            access_token: 'smoke-access-token',
            token_type: 'Bearer',
            expires_in: 3600
        });
    }

    if (pathname === '/v1/notifications/verify-webhook-signature') {
        return jsonResponse({ verification_status: 'SUCCESS' });
    }

    if (pathname === '/v2/checkout/orders' && (init && init.method) === 'POST') {
        const publicId = body
            && Array.isArray(body.purchase_units)
            && body.purchase_units[0]
            && (body.purchase_units[0].custom_id || body.purchase_units[0].reference_id);
        const paypalOrderId = `MOCK-ORDER-${String(this.orderCounter++).padStart(4, '0')}`;
        this.ordersByPayPalId.set(paypalOrderId, {
            publicId,
            intent: body && body.intent ? body.intent : 'CAPTURE'
        });

        return jsonResponse({
            id: paypalOrderId,
            status: 'CREATED',
            links: [{
                rel: 'approve',
                href: `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`
            }]
        });
    }

    const captureMatch = pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (captureMatch && (init && init.method) === 'POST') {
        const paypalOrderId = captureMatch[1];
        const order = this.ordersByPayPalId.get(paypalOrderId);
        const publicId = order && order.publicId;
        const outcome = this.outcomesByPublicId.get(publicId) || {};
        const captureId = `MOCK-CAP-${String(this.captureCounter++).padStart(4, '0')}`;
        const captureStatus = outcome.captureStatus || 'COMPLETED';

        return jsonResponse({
            id: paypalOrderId,
            status: captureStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
            purchase_units: [{
                payments: {
                    captures: [{
                        id: captureId,
                        status: captureStatus,
                        seller_protection: {
                            status: 'ELIGIBLE'
                        }
                    }]
                }
            }]
        });
    }

    const authorizeMatch = pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/authorize$/);
    if (authorizeMatch && (init && init.method) === 'POST') {
        const paypalOrderId = authorizeMatch[1];
        const order = this.ordersByPayPalId.get(paypalOrderId);
        const publicId = order && order.publicId;
        const outcome = this.outcomesByPublicId.get(publicId) || {};
        const authorizationId = `MOCK-AUTH-${String(this.authorizationCounter++).padStart(4, '0')}`;
        const authorizationStatus = outcome.authorizationStatus || 'AUTHORIZED';
        this.authorizationsById.set(authorizationId, {
            publicId,
            paypalOrderId
        });

        return jsonResponse({
            id: paypalOrderId,
            status: authorizationStatus,
            purchase_units: [{
                payments: {
                    authorizations: [{
                        id: authorizationId,
                        status: authorizationStatus
                    }]
                }
            }]
        });
    }

    const adminCaptureMatch = pathname.match(/^\/v2\/payments\/authorizations\/([^/]+)\/capture$/);
    if (adminCaptureMatch && (init && init.method) === 'POST') {
        const authorizationId = adminCaptureMatch[1];
        const authorization = this.authorizationsById.get(authorizationId);
        const outcome = this.outcomesByPublicId.get(authorization && authorization.publicId) || {};
        const captureStatus = outcome.adminCaptureStatus || 'COMPLETED';
        const captureId = `MOCK-CAP-${String(this.captureCounter++).padStart(4, '0')}`;

        return jsonResponse({
            id: captureId,
            status: captureStatus,
            seller_protection: {
                status: 'ELIGIBLE'
            }
        });
    }

    return jsonResponse({ message: `Unhandled PayPal mock route ${pathname}` }, 404);
};

async function readJsonBody(body) {
    if (!body) return null;
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (_) {
            return body;
        }
    }
    if (Buffer.isBuffer(body)) {
        try {
            return JSON.parse(body.toString('utf8'));
        } catch (_) {
            return body.toString('utf8');
        }
    }
    if (typeof body.text === 'function') {
        const text = await body.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (_) {
            return text;
        }
    }
    return null;
}

function encodeBase64UrlJson(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
        status: status || 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

main()
    .catch((error) => {
        console.error(`smoke failed: ${error.stack || error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        try {
            if (db) db.close();
        } catch (_) {
            // ignore
        }
        global.fetch = originalFetch;
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });
