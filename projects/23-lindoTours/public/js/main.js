let state = {
    language: 'es',
    currentView: 'catalog',
    currentTour: null,
    adults: 0,
    children: 0,
    addOns: {},
    cart: [],
    checkoutMode: false,
    checkoutStep: 1,
    checkoutPreviewMode: false,
    checkoutPreviewBackup: null,
    selectedPaymentMethod: 'bank_transfer',
    latestCheckoutOrder: null
};

let TOURS = {};
let HOTELS = [];
let CONFIG = {
    emailjs: {},
    whatsapp: {},
    contact: {
        email: '',
        phone: '',
        phoneDisplay: '',
        whatsappUrl: ''
    },
    demoMode: {
        enabled: false,
        paypalUrl: ''
    },
    auth: {
        customer: {
            enabled: false,
            passwordEnabled: false,
            googleEnabled: false,
            googleClientId: '',
            debugOtp: false,
            codeTtlMs: 0,
            sessionTtlMs: 0
        }
    },
    payments: {
        currency: 'USD',
        paypal: { enabled: false, clientId: null, accountEmail: null, feePercent: 0 },
        bankTransfer: {
            enabled: false,
            bankName: null,
            beneficiary: null,
            clabe: null,
            account: null,
            cardNumber: null,
            swift: null,
            referencePrefix: null,
            feePercent: 0
        }
    }
};

let galleryState = { current: 0, total: 0 };
let galleryAutoSlide = null;
let heroRotationTimer = null;
let heroIndex = 0;
let revealObserver = null;
let bookingSubmissionInProgress = false;
let lastFocusedBeforeCartModal = null;
let lastFocusedBeforeAuthModal = null;
let localCartOwner = 'guest';
let customerCartSyncTimer = null;
let googleIdentityInitialized = false;
let authUIState = {
    mode: 'login',
    busy: false
};
let adminOrdersState = {
    rows: [],
    selectedPublicId: '',
    detail: null
};
let customerAccountState = {
    session: null,
    profile: null,
    orders: [],
    selectedPublicId: ''
};
let customerPortalState = {
    session: null,
    data: null,
    source: 'portal'
};

var CUSTOMER_PORTAL_SESSION_KEY = 'lindotours_customer_portal';
var CUSTOMER_AUTH_SESSION_KEY = 'lindotours_customer_auth';
var CUSTOMER_CART_OWNER_KEY = 'lindotours_cart_owner';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAYPAL_LOGO_FALLBACK_SRC = '/imagenes/pagos/paypal-logo.svg';
const BANK_TRANSFER_LOGO_FALLBACK_SRC = '/imagenes/pagos/bank-transfer-icon.svg';
const PAYPAL_PAYER_AVATAR_ROUTE = '/imagenes/pagos/paypal-payer-avatar.jpg';

const I18N = {
    es: {
        from: 'Desde',
        viewDetails: 'Ver Detalles',
        backHome: 'Volver a Inicio',
        back: 'Volver',
        configureBooking: 'Configura tu Reservación',
        adultsLabel: 'Adultos (13+)',
        childrenLabel: 'Niños (5-12)',
        selectQuantity: 'Selecciona cantidad',
        perAdult: 'por adulto',
        perChild: 'por niño',
        addToCart: 'Agregar al Carrito',
        added: 'Agregado',
        select: 'Seleccionar',
        selected: 'Seleccionado',
        person: 'persona',
        total: 'Total',
        removed: 'Eliminado',
        removedMessage: 'Tour eliminado del carrito',
        addedMessage: 'Tour agregado al carrito',
        signedOut: 'Sesión cerrada',
        invalidCredentials: 'Credenciales incorrectas',
        adminAuthRequired: 'Inicia sesión para usar el panel de administración',
        sessionExpiredTitle: 'Sesión expirada',
        sessionExpiredMessage: 'Vuelve a iniciar sesión para continuar',
        cartEmpty: 'Tu carrito está vacío',
        previewCheckoutButton: 'Probar checkout demo',
        previewCheckoutTitle: 'Checkout demo',
        previewCheckoutMessage: 'Cargamos un servicio aleatorio y habilitamos una simulacion del pago final para revisar UI, comision y pasos sin depender de datos reales.',
        previewCheckoutCartLabel: 'Servicio demo',
        previewCheckoutCartValue: 'Tour de prueba precargado para revisar el flujo completo.',
        previewDemoBadge: 'MODO DEMO',
        previewDemoService: 'Servicio',
        previewDemoTravelers: 'Viajeros',
        previewSimulationNote: 'Los botones finales usan datos demo y no cobran de verdad.',
        demoPayPalLinkLabel: 'Link PayPal de prueba',
        adultUnit: 'adulto(s)',
        childUnit: 'niño(s)',
        maps: 'Mapa',
        mapsTitle: 'Ver en Google Maps',
        newBooking: '*NUEVA RESERVACIÓN*',
        tours: '*Tours:*',
        bookingSummary: 'Resumen de Reservación',
        name: 'Nombre',
        email: 'Email',
        phone: 'Teléfono',
        tourDate: 'Fecha del Tour',
        pickupTime: 'Hora de Recogida',
        hotel: 'Hotel',
        comments: 'Comentarios',
        notSpecified: 'No especificado',
        noComments: 'Sin comentarios',
        sendingBooking: 'Enviando reservación...',
        bookingSaved: 'Reservación guardada',
        bookingFailed: 'No se pudo enviar la reservación',
        bookingSentTitle: 'Reservación Enviada',
        bookingSentMessage: 'Te contactaremos pronto para confirmar.',
        bookingSavedForWhatsApp: 'Reservación guardada. Abriendo WhatsApp...',
        whatsappErrorTitle: 'Error en envío',
        whatsappErrorMessage: 'No se pudo guardar la reservación antes de abrir WhatsApp.',
        emailFallbackError: 'Error. Usa WhatsApp.',
        heroCta: 'Explorar Tours',
        bookingStatusIdle: '',
        bookingStatusLoading: 'Procesando y guardando tu reservación...',
        bookingStatusSuccess: 'Reservación enviada con éxito.',
        bookingStatusError: 'Ocurrió un error. Intenta nuevamente.',
        onlyJpgError: 'Solo se permiten imágenes JPG/JPEG en hero, card y galería.',
        invalidSlug: 'El slug del tour no es válido.',
        tourSaved: 'Tour guardado correctamente',
        saveError: 'No se pudo guardar el tour',
        totalToPay: 'Total final',
        closeCart: 'Cerrar carrito',
        removeFromCartAria: 'Eliminar tour del carrito',
        confirmStepInvalid: 'Completa los campos obligatorios antes de confirmar.',
        confirmCustomerDetails: 'Datos del Cliente',
        confirmToursAndTotal: 'Tours y Total',
        confirmLineAdults: 'Adultos',
        confirmLineChildren: 'Niños',
        backToCart: 'Volver al carrito',
        editDetails: 'Editar datos',
        paymentMethod: 'Método de pago',
        paymentMethodHelp: 'Elige PayPal o transferencia y revisa exactamente a dónde enviar el pago.',
        paymentPayPal: 'PayPal / Tarjeta',
        paymentPayPalDesc: 'Paga en línea y te redirigimos al perfil configurado de PayPal.',
        paymentTransfer: 'Transferencia bancaria',
        paymentTransferDesc: 'Copia los datos bancarios y envía el monto exacto.',
        paymentManual: 'Reservar por contacto',
        paymentManualDesc: 'Envía tu solicitud por WhatsApp o email para confirmación manual.',
        continueWithPayPal: 'Pagar con PayPal',
        getTransferInstructions: 'Ver instrucciones de transferencia',
        sendReservationEmail: 'Enviar reservación por email',
        sendReservationWhatsApp: 'Enviar por WhatsApp',
        orderNumber: 'Número de orden',
        subtotal: 'Subtotal',
        commission: 'Comisión',
        totalFinal: 'Total final',
        bankName: 'Banco',
        beneficiary: 'Beneficiario',
        clabe: 'CLABE',
        account: 'Cuenta',
        depositCard: 'Tarjeta para depósito',
        swift: 'SWIFT / BIC',
        reference: 'Referencia',
        paypalProfileLabel: 'Perfil PayPal',
        paypalProfileLink: 'Abrir perfil de PayPal',
        referencePending: 'Se confirma con tu número de orden',
        expiresAt: 'Vence',
        copy: 'Copiar',
        copiedTitle: 'Copiado',
        copiedMessage: 'Dato copiado al portapapeles.',
        copyFailed: 'No se pudo copiar el dato.',
        paymentHelpTitle: '¿Necesitas ayuda para pagar?',
        paymentHelpText: 'Te ayudamos por WhatsApp.',
        paymentHelpWhatsApp: 'Ayuda por WhatsApp',
        paymentLegendPayPal: 'PayPal / Tarjeta',
        paymentLegendTransfer: 'Transferencia',
        noCommission: 'Sin comisión',
        supportPaymentMessage: 'Hola, necesito ayuda para completar el pago de mi reservación.',
        selectedPaymentMethod: 'Método elegido',
        uploadProofTitle: 'Subir comprobante',
        uploadProofHelp: 'Sube tu comprobante para revisión.',
        uploadProofButton: 'Subir comprobante',
        uploadProofSuccess: 'Comprobante subido. Revisaremos tu transferencia.',
        uploadProofError: 'No se pudo subir el comprobante.',
        transferInstructionsReady: 'Orden creada. Transfiere a estos datos.',
        transferExactMatchNote: 'Usa monto y referencia exactos.',
        transferDestinationTitle: 'Dónde transferir',
        transferDetailsTitle: 'Referencia y monto exacto',
        transferAmountToSend: 'Monto a transferir',
        paypalPayerLabel: 'Pagador PayPal',
        paypalPayerUnknown: 'Cliente PayPal',
        paypalPayerId: 'ID PayPal',
        paypalRedirecting: 'Redirigiendo a PayPal...',
        paypalCheckoutCancelled: 'El pago en PayPal fue cancelado.',
        paypalPaymentCompleted: 'Pago completado. Tu orden quedó registrada.',
        paypalPaymentPending: 'La orden quedó autorizada o pendiente. La confirmación final depende del webhook.',
        paypalPaymentError: 'No se pudo finalizar el pago con PayPal.',
        previewPayPalSimulated: 'Pago PayPal simulado para revision visual.',
        previewTransferSimulated: 'Transferencia Banamex simulada con datos de prueba.',
        paymentMethodUnavailable: 'Este método de pago no está disponible en este momento.',
        manualOrderCreated: 'Tu solicitud fue registrada. Te contactaremos para confirmar.',
        manualOrderReference: 'Comparte tu número de orden si nos contactas por WhatsApp.',
        transferProofMissing: 'Selecciona un archivo antes de subir el comprobante.',
        adminOrdersTitle: 'Órdenes',
        adminPaymentsTitle: 'Pagos',
        adminLoadingOrders: 'Cargando órdenes...',
        adminNoOrders: 'No hay órdenes registradas todavía.',
        adminOrderDetailEmpty: 'Selecciona una orden para ver detalle.',
        adminCustomer: 'Cliente',
        adminPayment: 'Pago',
        adminOrderItems: 'Servicios',
        adminDocuments: 'Documentos',
        adminTransferSubmissions: 'Transferencias enviadas',
        adminRefreshSuccess: 'Órdenes actualizadas.',
        adminActionFailed: 'No se pudo completar la acción.',
        adminCapturePayment: 'Capturar PayPal',
        adminConfirmTransfer: 'Confirmar transferencia',
        adminCaptureSuccess: 'Pago PayPal capturado.',
        adminTransferConfirmed: 'Transferencia confirmada.',
        adminDownloadDocument: 'Descargar comprobante',
        adminNoDocuments: 'Sin documentos privados.',
        adminNoTransfers: 'Sin comprobantes enviados.',
        adminPaymentId: 'Pago ID',
        adminIntent: 'Intent',
        adminProviderStatus: 'Estado proveedor',
        adminOrderStatus: 'Estado orden',
        adminPaymentStatus: 'Estado pago',
        adminServiceDate: 'Fecha servicio',
        adminCreatedAt: 'Creada',
        adminGuestEmail: 'Email',
        adminGuestPhone: 'Teléfono',
        adminMethod: 'Método',
        adminAmount: 'Monto',
        adminMatchScore: 'Coincidencia',
        adminReviewedBy: 'Revisado por',
        adminStatusPaid: 'Pagada',
        adminStatusPending: 'Pendiente',
        adminStatusAwaitingTransfer: 'Esperando transferencia',
        adminStatusTransferSubmitted: 'Comprobante enviado',
        adminStatusAuthorized: 'Autorizada',
        adminStatusFailed: 'Fallida',
        adminStatusCancelled: 'Cancelada',
        adminStatusVoid: 'Anulada',
        myOrdersNav: 'Mis compras',
        myOrdersTitle: 'Mis compras',
        myOrdersIntro: 'Consulta el estado de tu orden, pagos y documentos usando tu número de orden y el email de compra.',
        myOrdersHint: 'Lo encuentras en el email de confirmación, en PayPal o en el mensaje de WhatsApp generado al reservar.',
        lookupOrderButton: 'Consultar orden',
        clearLookupButton: 'Limpiar',
        myOrdersEmpty: 'Ingresa tu número de orden y email para ver tus compras.',
        portalLoading: 'Buscando tu orden...',
        portalLookupSuccess: 'Orden encontrada.',
        portalLookupError: 'No encontramos una orden con esos datos.',
        portalSessionExpired: 'La sesión de esta orden expiró. Vuelve a consultarla.',
        portalSessionCleared: 'Se limpió la consulta de tu orden.',
        portalOrderSummary: 'Resumen de orden',
        portalPaymentSummary: 'Pago',
        portalServicesTitle: 'Servicios',
        portalDocumentsTitle: 'Documentos',
        portalTransfersTitle: 'Transferencias',
        portalNoDocuments: 'Aún no hay documentos disponibles.',
        portalNoTransfers: 'Aún no hemos recibido comprobantes.',
        portalDownloadDocument: 'Descargar documento',
        portalPaymentProvider: 'Proveedor',
        portalSessionExpires: 'Sesión disponible hasta',
        portalSubmittedAt: 'Enviado',
        portalReviewStatus: 'Revisión',
        accountAccessTitle: 'Acceso por email',
        accountAccessIntro: 'Pide un código de un solo uso para reclamar tus compras y ver todas las órdenes ligadas a tu email.',
        accountCodeLabel: 'Código',
        requestCodeButton: 'Enviar código',
        verifyCodeButton: 'Verificar código',
        customerLogoutButton: 'Cerrar sesión',
        customerAuthRequestSent: 'Código enviado. Revisa tu email o usa el código de prueba.',
        customerAuthVerified: 'Acceso confirmado. Tus órdenes ya están disponibles.',
        customerAuthInvalid: 'El código no es válido o ya venció.',
        customerAuthDebugTitle: 'Código de prueba',
        customerOrdersTitle: 'Tus órdenes',
        customerOrdersEmpty: 'Inicia sesión con tu email para ver todas tus órdenes.',
        customerOrdersHint: 'Las compras guest con el mismo email se enlazan después de verificar el código.',
        customerLoggedOut: 'Sesión de cliente cerrada',
        registerNav: 'Regístrate',
        loginNav: 'Iniciar sesión',
        accountNav: 'Mi cuenta',
        authCardKicker: 'Cuenta',
        authModalTitle: 'Accede a tu cuenta',
        authModalIntro: 'Guarda tus compras y recupéralas desde cualquier dispositivo.',
        authModalIntroRegister: 'Crea tu cuenta para sincronizar carrito, compras y reservas entre dispositivos.',
        authModalIntroLogin: 'Inicia sesión para restaurar tu carrito y tus compras guardadas.',
        authPasswordLabel: 'Contraseña',
        authConfirmPasswordLabel: 'Confirmar contraseña',
        continueWithEmail: 'Continuar con email',
        continueWithGoogle: 'Continuar con Google',
        authSecondaryGoogle: 'O continúa con Google',
        authFooterRegister: '¿Ya tienes cuenta? Inicia sesión',
        authFooterLogin: '¿Aún no tienes cuenta? Regístrate',
        authRegisterSuccess: 'Cuenta creada. Tus compras ya están disponibles.',
        authLoginSuccess: 'Sesión iniciada. Tus compras fueron restauradas.',
        authPasswordMismatch: 'Las contraseñas no coinciden.',
        authGoogleUnavailable: 'Google Sign-In no está listo en este momento.',
        authGoogleError: 'No se pudo completar el acceso con Google.',
        authGoogleSetupHint: 'Google Sign-In estará disponible cuando se configure GOOGLE_CLIENT_ID en el servidor.',
        authGoogleReadyHint: 'También puedes entrar con Google en un solo paso.',
        authGoogleLoading: 'Estamos cargando Google Sign-In...',
        authAccountExists: 'Este correo ya está registrado.',
        authInvalidCredentials: 'Correo o contraseña incorrectos.',
        authPasswordRules: 'La contraseña debe tener al menos 8 caracteres.',
        authEmailRequired: 'Ingresa tu correo electrónico.',
        authContinueAsGuest: 'Seguir explorando sin cuenta',
        accountOrdersIntro: 'Tus compras y tu carrito se sincronizan con tu cuenta para recuperarlos desde cualquier dispositivo.',
        accountOrdersEmptyState: 'Selecciona una orden para ver su detalle.',
        accountGuestProfileName: 'Explora sin iniciar sesión',
        accountGuestProfileEmail: 'Tu carrito y tus órdenes se pueden sincronizar cuando quieras.',
        accountGuestBadge: 'Cuenta opcional',
        accountGuestTitle: 'Navega, agrega tours al carrito y entra sólo cuando quieras guardar todo en tu cuenta.',
        accountGuestCopy: 'No necesitas iniciar sesión para explorar la web. Usa tu cuenta sólo si quieres sincronizar compras, restaurar tu carrito o ver órdenes desde otro dispositivo.',
        accountGuestBenefitSync: 'Carrito sincronizado',
        accountGuestBenefitOrders: 'Órdenes en un solo lugar',
        accountGuestBenefitFastCheckout: 'Checkout más rápido',
        accountGuestBrowse: 'Seguir explorando',
        accountGuestOrdersEmpty: 'Inicia sesión cuando quieras para ver aquí todas tus órdenes y compras recuperadas.',
        accountGuestDetailEmpty: 'Explora tours o inicia sesión para ver aquí el detalle de tus órdenes.',
        accountRestored: 'Restauramos tu cuenta y tu carrito.'
    },
    en: {
        from: 'From',
        viewDetails: 'View Details',
        backHome: 'Back to Home',
        back: 'Back',
        configureBooking: 'Configure Your Booking',
        adultsLabel: 'Adults (13+)',
        childrenLabel: 'Children (5-12)',
        selectQuantity: 'Select quantity',
        perAdult: 'per adult',
        perChild: 'per child',
        addToCart: 'Add to Cart',
        added: 'Added',
        select: 'Select',
        selected: 'Selected',
        person: 'person',
        total: 'Total',
        removed: 'Removed',
        removedMessage: 'Tour removed from cart',
        addedMessage: 'Tour added to cart',
        signedOut: 'Signed out',
        invalidCredentials: 'Invalid credentials',
        adminAuthRequired: 'Please sign in to use the admin dashboard',
        sessionExpiredTitle: 'Session expired',
        sessionExpiredMessage: 'Sign in again to continue',
        cartEmpty: 'Your cart is empty',
        previewCheckoutButton: 'Try demo checkout',
        previewCheckoutTitle: 'Demo checkout',
        previewCheckoutMessage: 'We preload a random service and enable a simulated final payment so you can review the UI, fee, and steps without real customer data.',
        previewCheckoutCartLabel: 'Demo service',
        previewCheckoutCartValue: 'A sample tour is preloaded so you can review the full flow.',
        previewDemoBadge: 'DEMO MODE',
        previewDemoService: 'Service',
        previewDemoTravelers: 'Travelers',
        previewSimulationNote: 'Final action buttons use demo data and do not charge for real.',
        demoPayPalLinkLabel: 'PayPal test link',
        adultUnit: 'adult(s)',
        childUnit: 'child(ren)',
        maps: 'Maps',
        mapsTitle: 'Open in Google Maps',
        newBooking: '*NEW BOOKING*',
        tours: '*Tours:*',
        bookingSummary: 'Booking Summary',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        tourDate: 'Tour Date',
        pickupTime: 'Pickup Time',
        hotel: 'Hotel',
        comments: 'Comments',
        notSpecified: 'Not specified',
        noComments: 'No comments',
        sendingBooking: 'Sending booking...',
        bookingSaved: 'Booking saved',
        bookingFailed: 'Booking could not be sent',
        bookingSentTitle: 'Booking Sent',
        bookingSentMessage: 'We will contact you soon to confirm.',
        bookingSavedForWhatsApp: 'Booking saved. Opening WhatsApp...',
        whatsappErrorTitle: 'Send error',
        whatsappErrorMessage: 'Booking could not be saved before opening WhatsApp.',
        emailFallbackError: 'Error. Use WhatsApp.',
        heroCta: 'Explore Tours',
        bookingStatusIdle: '',
        bookingStatusLoading: 'Processing and saving your booking...',
        bookingStatusSuccess: 'Booking sent successfully.',
        bookingStatusError: 'An error occurred. Please try again.',
        onlyJpgError: 'Only JPG/JPEG images are allowed for hero, card, and gallery.',
        invalidSlug: 'The tour slug is invalid.',
        tourSaved: 'Tour saved successfully',
        saveError: 'Tour could not be saved',
        totalToPay: 'Final total',
        closeCart: 'Close cart',
        removeFromCartAria: 'Remove tour from cart',
        confirmStepInvalid: 'Complete required fields before confirming.',
        confirmCustomerDetails: 'Customer Details',
        confirmToursAndTotal: 'Tours and Total',
        confirmLineAdults: 'Adults',
        confirmLineChildren: 'Children',
        backToCart: 'Back to cart',
        editDetails: 'Edit details',
        paymentMethod: 'Payment method',
        paymentMethodHelp: 'Choose PayPal or bank transfer and review exactly where the money goes.',
        paymentPayPal: 'PayPal / Card',
        paymentPayPalDesc: 'Pay online and we will redirect you to the configured PayPal profile.',
        paymentTransfer: 'Bank transfer',
        paymentTransferDesc: 'Copy the bank details and send the exact amount.',
        paymentManual: 'Book by contact',
        paymentManualDesc: 'Send your request by WhatsApp or email for manual confirmation.',
        continueWithPayPal: 'Pay with PayPal',
        getTransferInstructions: 'Show transfer instructions',
        sendReservationEmail: 'Send booking by email',
        sendReservationWhatsApp: 'Send via WhatsApp',
        orderNumber: 'Order number',
        subtotal: 'Subtotal',
        commission: 'Fee',
        totalFinal: 'Final total',
        bankName: 'Bank',
        beneficiary: 'Beneficiary',
        clabe: 'CLABE',
        account: 'Account',
        depositCard: 'Deposit card',
        swift: 'SWIFT / BIC',
        reference: 'Reference',
        paypalProfileLabel: 'PayPal profile',
        paypalProfileLink: 'Open PayPal profile',
        referencePending: 'Confirmed with your order number',
        expiresAt: 'Expires',
        copy: 'Copy',
        copiedTitle: 'Copied',
        copiedMessage: 'Copied to clipboard.',
        copyFailed: 'The value could not be copied.',
        paymentHelpTitle: 'Need help paying?',
        paymentHelpText: 'We can help you on WhatsApp.',
        paymentHelpWhatsApp: 'WhatsApp help',
        paymentLegendPayPal: 'PayPal / Card',
        paymentLegendTransfer: 'Transfer',
        noCommission: 'No fee',
        supportPaymentMessage: 'Hi, I need help completing the payment for my booking.',
        selectedPaymentMethod: 'Selected method',
        uploadProofTitle: 'Upload proof',
        uploadProofHelp: 'Upload your payment proof for review.',
        uploadProofButton: 'Upload proof',
        uploadProofSuccess: 'Proof uploaded. We will review your transfer.',
        uploadProofError: 'The proof could not be uploaded.',
        transferInstructionsReady: 'Order created. Transfer using these details.',
        transferExactMatchNote: 'Use the exact amount and exact reference.',
        transferDestinationTitle: 'Where to transfer',
        transferDetailsTitle: 'Reference and exact amount',
        transferAmountToSend: 'Amount to transfer',
        paypalPayerLabel: 'PayPal payer',
        paypalPayerUnknown: 'PayPal customer',
        paypalPayerId: 'PayPal ID',
        paypalRedirecting: 'Redirecting to PayPal...',
        paypalCheckoutCancelled: 'The PayPal checkout was canceled.',
        paypalPaymentCompleted: 'Payment completed. Your order is now registered.',
        paypalPaymentPending: 'The order is authorized or pending. Final confirmation depends on the webhook.',
        paypalPaymentError: 'The PayPal payment could not be finalized.',
        previewPayPalSimulated: 'PayPal payment simulated for visual review.',
        previewTransferSimulated: 'Banamex transfer simulated with sample data.',
        paymentMethodUnavailable: 'This payment method is not available right now.',
        manualOrderCreated: 'Your request was recorded. We will contact you to confirm.',
        manualOrderReference: 'Share your order number if you contact us on WhatsApp.',
        transferProofMissing: 'Select a file before uploading your proof.',
        adminOrdersTitle: 'Orders',
        adminPaymentsTitle: 'Payments',
        adminLoadingOrders: 'Loading orders...',
        adminNoOrders: 'No orders have been registered yet.',
        adminOrderDetailEmpty: 'Select an order to view details.',
        adminCustomer: 'Customer',
        adminPayment: 'Payment',
        adminOrderItems: 'Services',
        adminDocuments: 'Documents',
        adminTransferSubmissions: 'Submitted transfers',
        adminRefreshSuccess: 'Orders refreshed.',
        adminActionFailed: 'The action could not be completed.',
        adminCapturePayment: 'Capture PayPal',
        adminConfirmTransfer: 'Confirm transfer',
        adminCaptureSuccess: 'PayPal payment captured.',
        adminTransferConfirmed: 'Transfer confirmed.',
        adminDownloadDocument: 'Download proof',
        adminNoDocuments: 'No private documents.',
        adminNoTransfers: 'No submitted proofs.',
        adminPaymentId: 'Payment ID',
        adminIntent: 'Intent',
        adminProviderStatus: 'Provider status',
        adminOrderStatus: 'Order status',
        adminPaymentStatus: 'Payment status',
        adminServiceDate: 'Service date',
        adminCreatedAt: 'Created',
        adminGuestEmail: 'Email',
        adminGuestPhone: 'Phone',
        adminMethod: 'Method',
        adminAmount: 'Amount',
        adminMatchScore: 'Match score',
        adminReviewedBy: 'Reviewed by',
        adminStatusPaid: 'Paid',
        adminStatusPending: 'Pending',
        adminStatusAwaitingTransfer: 'Awaiting transfer',
        adminStatusTransferSubmitted: 'Proof submitted',
        adminStatusAuthorized: 'Authorized',
        adminStatusFailed: 'Failed',
        adminStatusCancelled: 'Cancelled',
        adminStatusVoid: 'Voided',
        myOrdersNav: 'My orders',
        myOrdersTitle: 'My orders',
        myOrdersIntro: 'Check your order status, payments, and documents using your order number and purchase email.',
        myOrdersHint: 'You can find it in your confirmation email, in PayPal, or in the WhatsApp message generated during checkout.',
        lookupOrderButton: 'Find order',
        clearLookupButton: 'Clear',
        myOrdersEmpty: 'Enter your order number and email to view your purchases.',
        portalLoading: 'Looking up your order...',
        portalLookupSuccess: 'Order found.',
        portalLookupError: 'We could not find an order matching those details.',
        portalSessionExpired: 'This order session expired. Look it up again.',
        portalSessionCleared: 'Your order lookup was cleared.',
        portalOrderSummary: 'Order summary',
        portalPaymentSummary: 'Payment',
        portalServicesTitle: 'Services',
        portalDocumentsTitle: 'Documents',
        portalTransfersTitle: 'Transfers',
        portalNoDocuments: 'No documents are available yet.',
        portalNoTransfers: 'We have not received any proofs yet.',
        portalDownloadDocument: 'Download document',
        portalPaymentProvider: 'Provider',
        portalSessionExpires: 'Session available until',
        portalSubmittedAt: 'Submitted',
        portalReviewStatus: 'Review',
        accountAccessTitle: 'Email access',
        accountAccessIntro: 'Request a one-time code to claim your purchases and view all orders linked to your email.',
        accountCodeLabel: 'Code',
        requestCodeButton: 'Send code',
        verifyCodeButton: 'Verify code',
        customerLogoutButton: 'Sign out',
        customerAuthRequestSent: 'Code sent. Check your email or use the debug code.',
        customerAuthVerified: 'Access confirmed. Your orders are now available.',
        customerAuthInvalid: 'The code is invalid or expired.',
        customerAuthDebugTitle: 'Debug code',
        customerOrdersTitle: 'Your orders',
        customerOrdersEmpty: 'Sign in with your email to view all of your orders.',
        customerOrdersHint: 'Guest purchases with the same email are linked after you verify the code.',
        customerLoggedOut: 'Customer session closed',
        registerNav: 'Sign up',
        loginNav: 'Log in',
        accountNav: 'My account',
        authCardKicker: 'Account',
        authModalTitle: 'Access your account',
        authModalIntro: 'Save your purchases and recover them from any device.',
        authModalIntroRegister: 'Create your account to sync your cart, purchases, and bookings across devices.',
        authModalIntroLogin: 'Sign in to restore your saved cart and purchases.',
        authPasswordLabel: 'Password',
        authConfirmPasswordLabel: 'Confirm password',
        continueWithEmail: 'Continue with email',
        continueWithGoogle: 'Continue with Google',
        authSecondaryGoogle: 'Or continue with Google',
        authFooterRegister: 'Already have an account? Log in',
        authFooterLogin: 'Still need an account? Sign up',
        authRegisterSuccess: 'Account created. Your purchases are now available.',
        authLoginSuccess: 'Signed in. Your purchases were restored.',
        authPasswordMismatch: 'Passwords do not match.',
        authGoogleUnavailable: 'Google Sign-In is not ready right now.',
        authGoogleError: 'Google sign-in could not be completed.',
        authGoogleSetupHint: 'Google Sign-In will be available once GOOGLE_CLIENT_ID is configured on the server.',
        authGoogleReadyHint: 'You can also sign in with Google in one step.',
        authGoogleLoading: 'Loading Google Sign-In...',
        authAccountExists: 'This email is already registered.',
        authInvalidCredentials: 'Incorrect email or password.',
        authPasswordRules: 'Password must contain at least 8 characters.',
        authEmailRequired: 'Enter your email address.',
        authContinueAsGuest: 'Keep exploring without an account',
        accountOrdersIntro: 'Your purchases and cart sync with your account so you can recover them from any device.',
        accountOrdersEmptyState: 'Select an order to view its details.',
        accountGuestProfileName: 'Explore without signing in',
        accountGuestProfileEmail: 'Your cart and orders can be synced whenever you want.',
        accountGuestBadge: 'Optional account',
        accountGuestTitle: 'Browse freely, add tours to your cart, and sign in only when you want to save everything to your account.',
        accountGuestCopy: 'You do not need to sign in to explore the website. Use your account only if you want to sync purchases, restore your cart, or view orders from another device.',
        accountGuestBenefitSync: 'Synced cart',
        accountGuestBenefitOrders: 'Orders in one place',
        accountGuestBenefitFastCheckout: 'Faster checkout',
        accountGuestBrowse: 'Keep exploring',
        accountGuestOrdersEmpty: 'Sign in whenever you want to see all your restored orders and purchases here.',
        accountGuestDetailEmpty: 'Explore tours or sign in to view your order details here.',
        accountRestored: 'Your account and cart were restored.'
    }
};

var SVG = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    bank: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18"/><path d="M5 10v7"/><path d="M12 10v7"/><path d="M19 10v7"/><path d="M2 21h20"/><path d="M12 3l9 4v3H3V7l9-4z"/></svg>',
    card: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/></svg>',
    warning: '<svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>',
    glasses: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15h4"/></svg>',
    hat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 18h20"/><path d="M4 18v-4a8 8 0 0 1 16 0v4"/></svg>',
    water: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l5 10a5 5 0 0 1-10 0z"/></svg>',
    camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    swim: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/><circle cx="12" cy="7" r="3"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>'
};

var SEA_HERO_SLIDES = [
    'imagenes/servicios/whale_shark_snorkel_from_cancun/1.jpg',
    'imagenes/servicios/isla_mujeres_catamaran_day_trip/1.jpg',
    'imagenes/servicios/isla_contoy/1.jpg',
    'imagenes/servicios/tulum_akumal_snorkel_tortugas/1.jpg'
];

var COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
var COMMONS_HERO_SEARCH_TERMS = [
    'Cancun beach caribbean sea',
    'Playa Delfines Cancun beach',
    'Riviera Maya beach Mexico'
];
var checkoutHeroRotationTimer = null;
var checkoutHeroIndex = 0;
var checkoutHeroRemoteSlides = null;

var TOUR_CATEGORY_META = {
    sea: {
        className: 'sea',
        labels: { es: 'Mar', en: 'Sea' }
    },
    ruins: {
        className: 'ruins',
        labels: { es: 'Ruinas', en: 'Ruins' }
    },
    adventure: {
        className: 'adventure',
        labels: { es: 'Aventura', en: 'Adventure' }
    },
    city: {
        className: 'city',
        labels: { es: 'Ciudad', en: 'City' }
    }
};

function t(key) {
    var dict = I18N[state.language] || I18N.es;
    return dict[key] || key;
}

function isDemoModeEnabled() {
    return Boolean(CONFIG.demoMode && CONFIG.demoMode.enabled);
}

function applyDemoModeState() {
    var enabled = isDemoModeEnabled();
    var banner = document.getElementById('demo-mode-banner');
    document.body.classList.toggle('demo-mode', enabled);
    if (banner) banner.hidden = !enabled;
}

function updateContactInfoUI() {
    var contact = CONFIG.contact || {};
    var email = safeText(contact.email).trim();
    var phoneDisplay = safeText(contact.phoneDisplay || contact.phone).trim();
    var whatsappUrl = safeText(contact.whatsappUrl || (CONFIG.whatsapp && CONFIG.whatsapp.url)).trim();

    var contactPhoneText = document.getElementById('contact-phone-text');
    var contactEmailLink = document.getElementById('contact-email-link');
    var contactWhatsAppLink = document.getElementById('contact-whatsapp-link');
    var footerEmail = document.getElementById('footer-contact-email');
    var footerPhone = document.getElementById('footer-contact-phone');

    if (contactPhoneText && phoneDisplay) contactPhoneText.textContent = phoneDisplay;
    if (footerPhone && phoneDisplay) footerPhone.textContent = phoneDisplay;

    if (contactEmailLink && email) {
        contactEmailLink.textContent = email;
        contactEmailLink.href = 'mailto:' + email;
    }
    if (footerEmail && email) footerEmail.textContent = email;

    if (contactWhatsAppLink && whatsappUrl) {
        contactWhatsAppLink.href = whatsappUrl;
    }
}

function normalizeLanguage(lang) {
    return lang === 'en' ? 'en' : 'es';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function safeText(value) {
    return String(value == null ? '' : value);
}

function safeInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
}

function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function roundCurrencyAmount(value) {
    var n = safeNumber(value, NaN);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function parseJson(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
}

function formatDateTime(value) {
    if (!value) return t('notSpecified');

    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return safeText(value);

    return parsed.toLocaleString(state.language === 'en' ? 'en-US' : 'es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function randomIntBetween(min, max) {
    var lower = Math.ceil(Math.min(min, max));
    var upper = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function pickRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[randomIntBetween(0, items.length - 1)];
}

function getDisplayBankTransferConfig() {
    var bankTransfer = CONFIG.payments && CONFIG.payments.bankTransfer ? CONFIG.payments.bankTransfer : {};
    var previewFallback = isCheckoutPreviewModeActive() || isDemoModeEnabled();

    return {
        bankName: safeText(bankTransfer.bankName).trim() || (previewFallback ? 'Banamex' : ''),
        beneficiary: safeText(bankTransfer.beneficiary).trim() || (previewFallback ? 'Miarsito Demo' : ''),
        clabe: safeText(bankTransfer.clabe).trim() || (previewFallback ? '002180700000123456' : ''),
        account: safeText(bankTransfer.account).trim() || (previewFallback ? '7001234567' : ''),
        cardNumber: safeText(bankTransfer.cardNumber).trim() || (previewFallback ? '5204161234567890' : ''),
        swift: safeText(bankTransfer.swift).trim() || (previewFallback ? 'BNMXMXMM' : ''),
        referencePrefix: safeText(bankTransfer.referencePrefix).trim() || 'LT'
    };
}

function getConfiguredPaymentMethods() {
    var methods = [];
    if (CONFIG.payments && CONFIG.payments.bankTransfer && CONFIG.payments.bankTransfer.enabled) {
        methods.push('bank_transfer');
    }
    if (CONFIG.payments && CONFIG.payments.paypal && CONFIG.payments.paypal.enabled) {
        methods.push('paypal');
    }
    if (isCheckoutPreviewModeActive() || isDemoModeEnabled()) {
        if (methods.indexOf('bank_transfer') === -1) methods.push('bank_transfer');
        if (methods.indexOf('paypal') === -1) methods.push('paypal');
    }
    return methods;
}

function getDefaultPaymentMethod() {
    var available = getConfiguredPaymentMethods();
    return available[0] || '';
}

function ensureSelectedPaymentMethod() {
    var available = getConfiguredPaymentMethods();
    if (available.indexOf(state.selectedPaymentMethod) === -1) {
        state.selectedPaymentMethod = getDefaultPaymentMethod();
    }
    return state.selectedPaymentMethod;
}

function clearCheckoutResult() {
    state.latestCheckoutOrder = null;

    var card = document.getElementById('checkout-result-card');
    var message = document.getElementById('checkout-result-message');
    var grid = document.getElementById('checkout-result-grid');
    var proofBox = document.getElementById('transfer-proof-box');
    var proofFile = document.getElementById('transfer-proof-file');

    if (card) card.hidden = true;
    if (message) message.textContent = '';
    if (grid) {
        grid.className = 'checkout-result-grid';
        grid.replaceChildren();
    }
    if (proofBox) proofBox.hidden = true;
    if (proofFile) proofFile.value = '';
    renderCheckoutPaymentCards();
}

async function copyTextValue(value) {
    var text = safeText(value);
    if (!text) return;

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            var helper = document.createElement('textarea');
            helper.value = text;
            helper.setAttribute('readonly', 'readonly');
            helper.style.position = 'absolute';
            helper.style.left = '-9999px';
            document.body.appendChild(helper);
            helper.select();
            document.execCommand('copy');
            document.body.removeChild(helper);
        }
        showToast('success', t('copiedTitle'), t('copiedMessage'));
    } catch (_) {
        showToast('error', t('whatsappErrorTitle'), t('copyFailed'));
    }
}

function appendCheckoutResultItem(container, label, value, options) {
    if (!container) return;
    var opts = options || {};

    var item = document.createElement('div');
    item.className = 'checkout-result-item';

    var labelEl = document.createElement('span');
    labelEl.textContent = label;

    var valueWrap = document.createElement('div');
    valueWrap.className = 'checkout-result-item-value';

    var valueEl;
    if (opts.href) {
        valueEl = document.createElement('a');
        valueEl.className = 'checkout-result-link';
        valueEl.href = opts.href;
        valueEl.target = '_blank';
        valueEl.rel = 'noopener';
        valueEl.textContent = opts.linkText || value;
    } else {
        valueEl = document.createElement('strong');
        valueEl.textContent = value;
    }

    item.appendChild(labelEl);
    valueWrap.appendChild(valueEl);

    if (opts.copyValue) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'checkout-copy-btn';
        button.textContent = t('copy');
        button.addEventListener('click', function () {
            copyTextValue(opts.copyValue);
        });
        valueWrap.appendChild(button);
    }

    item.appendChild(valueWrap);
    container.appendChild(item);
}

function appendPaymentCardDetail(container, label, value, options) {
    if (!container) return;

    var opts = options || {};
    var normalizedValue = safeText(value).trim();
    if (!normalizedValue && !opts.href) return;

    var item = document.createElement('div');
    item.className = 'payment-card-detail';

    var labelEl = document.createElement('span');
    labelEl.className = 'payment-card-detail-label';
    labelEl.textContent = label;

    var valueWrap = document.createElement('div');
    valueWrap.className = 'payment-card-detail-value';

    var valueEl;
    if (opts.href) {
        valueEl = document.createElement('a');
        valueEl.className = 'payment-card-detail-link';
        valueEl.href = opts.href;
        valueEl.target = '_blank';
        valueEl.rel = 'noopener';
        valueEl.textContent = opts.linkText || normalizedValue;
    } else {
        valueEl = document.createElement('strong');
        valueEl.textContent = normalizedValue;
    }

    item.appendChild(labelEl);
    valueWrap.appendChild(valueEl);

    if (opts.copyValue) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'checkout-copy-btn';
        button.textContent = t('copy');
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            copyTextValue(opts.copyValue);
        });
        valueWrap.appendChild(button);
    }

    item.appendChild(valueWrap);
    container.appendChild(item);
}

function createCheckoutResultSection(title) {
    var section = document.createElement('section');
    section.className = 'checkout-result-section';

    var heading = document.createElement('h6');
    heading.className = 'checkout-result-section-title';
    heading.textContent = title;
    section.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'checkout-result-grid compact';
    section.appendChild(grid);

    return {
        section: section,
        grid: grid
    };
}

function appendCheckoutResultHighlight(section, label, value) {
    if (!section) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'checkout-result-highlight';

    var labelEl = document.createElement('p');
    labelEl.className = 'checkout-result-highlight-label';
    labelEl.textContent = label;

    var valueEl = document.createElement('p');
    valueEl.className = 'checkout-result-highlight-value';
    valueEl.textContent = value;

    wrapper.appendChild(labelEl);
    wrapper.appendChild(valueEl);

    var sectionGrid = section.querySelector('.checkout-result-grid');
    if (sectionGrid) {
        section.insertBefore(wrapper, sectionGrid);
        return;
    }
    section.appendChild(wrapper);
}

function getAvatarInitials(seedText) {
    var normalized = safeText(seedText).trim();
    if (!normalized) return 'PP';

    var parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PP';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function buildCheckoutAvatarFallbackDataUrl(seedText) {
    var seed = safeText(seedText || 'paypal').toLowerCase();
    var hash = 0;
    for (var i = 0; i < seed.length; i += 1) {
        hash = ((hash * 31) + seed.charCodeAt(i)) % 360;
    }
    var hue = Math.abs(hash) % 360;
    var initials = getAvatarInitials(seedText);
    var svg = ''
        + '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'
        + '<rect width="96" height="96" fill="hsl(' + hue + ',72%,44%)"/>'
        + '<text x="50%" y="55%" fill="#ffffff" font-size="36" font-family="Arial, sans-serif" '
        + 'font-weight="700" text-anchor="middle" dominant-baseline="middle">' + initials + '</text>'
        + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function normalizePayPalPayer(orderResult) {
    var raw = orderResult && orderResult.payer
        ? orderResult.payer
        : (orderResult && orderResult.payment && orderResult.payment.payer ? orderResult.payment.payer : null);
    raw = raw && typeof raw === 'object' ? raw : {};

    var givenName = safeText(raw.givenName || raw.firstName).trim();
    var surname = safeText(raw.surname || raw.lastName).trim();
    var fullName = safeText(raw.fullName || raw.name).trim();
    var combinedName = [givenName, surname].filter(Boolean).join(' ');
    if (!fullName) fullName = combinedName;
    if (!fullName) {
        var customerNameInput = document.getElementById('customer-name');
        fullName = safeText(customerNameInput && customerNameInput.value).trim();
    }

    var email = safeText(raw.email || raw.emailAddress).trim();
    if (!email) {
        var customerEmailInput = document.getElementById('customer-email');
        email = safeText(customerEmailInput && customerEmailInput.value).trim();
    }

    var payerId = safeText(raw.payerId || raw.id).trim();
    var countryCode = safeText(raw.countryCode || raw.country).trim().toUpperCase();
    var imageUrl = safeText(raw.imageUrl || raw.picture || raw.avatarUrl || raw.photoUrl).trim();
    if (imageUrl && !/^(https?:\/\/|\/|data:image\/)/i.test(imageUrl)) {
        imageUrl = '';
    }

    var fallbackSeed = fullName || email || payerId || 'paypal';
    return {
        fullName: fullName,
        email: email,
        payerId: payerId,
        countryCode: countryCode,
        imageUrl: imageUrl || PAYPAL_PAYER_AVATAR_ROUTE,
        fallbackAvatar: buildCheckoutAvatarFallbackDataUrl(fallbackSeed)
    };
}

function renderPayPalPayerCard(container, orderResult) {
    if (!container || !orderResult) return;

    var payer = normalizePayPalPayer(orderResult);
    if (!payer.fullName && !payer.email && !payer.payerId && !payer.countryCode) return;

    var card = document.createElement('div');
    card.className = 'checkout-payer-card';

    var avatar = document.createElement('img');
    avatar.className = 'checkout-payer-avatar';
    avatar.alt = payer.fullName || t('paypalPayerUnknown');
    avatar.src = payer.imageUrl || payer.fallbackAvatar;
    avatar.loading = 'lazy';
    avatar.decoding = 'async';
    avatar.addEventListener('error', function () {
        if (avatar.dataset.fallbackApplied === '1') return;
        avatar.dataset.fallbackApplied = '1';
        avatar.src = payer.fallbackAvatar;
    });

    var copy = document.createElement('div');
    copy.className = 'checkout-payer-copy';

    var label = document.createElement('span');
    label.className = 'checkout-payer-label';
    label.textContent = t('paypalPayerLabel');

    var name = document.createElement('strong');
    name.className = 'checkout-payer-name';
    name.textContent = payer.fullName || t('paypalPayerUnknown');

    var meta = document.createElement('span');
    meta.className = 'checkout-payer-meta';
    var metaParts = [];
    if (payer.email) metaParts.push(payer.email);
    if (payer.payerId) metaParts.push(t('paypalPayerId') + ': ' + payer.payerId);
    if (payer.countryCode) metaParts.push(payer.countryCode);
    meta.textContent = metaParts.join(' · ');

    copy.appendChild(label);
    copy.appendChild(name);
    if (meta.textContent) copy.appendChild(meta);

    card.appendChild(avatar);
    card.appendChild(copy);
    container.appendChild(card);
}

function buildCurrentPageUrl(params) {
    var url = new URL(window.location.pathname, window.location.origin);
    Object.keys(params || {}).forEach(function (key) {
        if (params[key] != null && params[key] !== '') {
            url.searchParams.set(key, params[key]);
        }
    });
    return url.toString();
}

function clearCheckoutQueryParams() {
    var url = new URL(window.location.href);
    ['paypal_return', 'paypal_cancel', 'order_public_id', 'token', 'PayerID'].forEach(function (key) {
        url.searchParams.delete(key);
    });
    history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + (url.hash || ''));
}

function formatCurrency(amount, currency) {
    var normalizedCurrency = safeText(currency || (CONFIG.payments && CONFIG.payments.currency) || 'USD').toUpperCase();
    var normalizedAmount = roundCurrencyAmount(amount);
    var amountText = normalizedAmount % 1 === 0 ? String(normalizedAmount.toFixed(0)) : normalizedAmount.toFixed(2);
    return '$' + amountText + ' ' + normalizedCurrency;
}

function formatFeePercent(value) {
    var amount = roundCurrencyAmount(value);
    return amount % 1 === 0 ? String(amount.toFixed(0)) : amount.toFixed(2);
}

function getPaymentFeePercent(method) {
    if (method === 'paypal') {
        return roundCurrencyAmount(CONFIG.payments && CONFIG.payments.paypal ? CONFIG.payments.paypal.feePercent : 0);
    }
    if (method === 'bank_transfer') {
        return roundCurrencyAmount(CONFIG.payments && CONFIG.payments.bankTransfer ? CONFIG.payments.bankTransfer.feePercent : 0);
    }
    return 0;
}

function getCartPricingBreakdown(method) {
    var subtotal = roundCurrencyAmount(getCartTotalUSD());
    var feePercent = getPaymentFeePercent(method || getSelectedPaymentMethod());
    var feeAmount = roundCurrencyAmount(subtotal * (feePercent / 100));
    return {
        subtotal: subtotal,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalFinal: roundCurrencyAmount(subtotal + feeAmount)
    };
}

function getPaymentTitle(method, feePercentOverride) {
    var bankName = getDisplayBankTransferConfig().bankName;
    var feePercentValue = Number.isFinite(safeNumber(feePercentOverride, NaN)) ? roundCurrencyAmount(feePercentOverride) : getPaymentFeePercent(method);
    var feePercent = formatFeePercent(feePercentValue);

    if (method === 'paypal') {
        return t('paymentPayPal') + (feePercentValue > 0 ? ' +' + feePercent + '%' : '');
    }
    if (method === 'bank_transfer') {
        return t('paymentTransfer') + (bankName ? ' ' + bankName : '');
    }
    if (method === 'manual_contact') return t('paymentManual');
    return safeText(method).replace(/_/g, ' ') || t('notSpecified');
}

function getPaymentDescription(method) {
    var bankName = getDisplayBankTransferConfig().bankName;

    if (method === 'paypal') {
        return t('paymentPayPalDesc');
    }
    if (method === 'bank_transfer') {
        return bankName ? bankName + '. ' + t('paymentTransferDesc') : t('paymentTransferDesc');
    }
    return t('paymentManualDesc');
}

function getPayPalCtaLabel() {
    if (isDemoModeEnabled()) {
        return state.language === 'en' ? 'Open demo PayPal' : 'Abrir PayPal demo';
    }
    var feePercent = getPaymentFeePercent('paypal');
    if (feePercent > 0) {
        return state.language === 'en'
            ? 'Pay online +' + formatFeePercent(feePercent) + '%'
            : 'Pagar online +' + formatFeePercent(feePercent) + '%';
    }
    return t('continueWithPayPal');
}

function getPrimaryCheckoutActionLabel(method) {
    var value = safeText(method).toLowerCase();
    if (value === 'bank_transfer') return t('getTransferInstructions');
    return getPayPalCtaLabel();
}

function getPayPalProfileUrl() {
    var paypal = CONFIG.payments && CONFIG.payments.paypal ? CONFIG.payments.paypal : {};
    return safeText(paypal.profileUrl || (CONFIG.demoMode && CONFIG.demoMode.paypalUrl) || '').trim();
}

function getPayPalAccountEmail() {
    var paypal = CONFIG.payments && CONFIG.payments.paypal ? CONFIG.payments.paypal : {};
    return safeText(paypal.accountEmail || paypal.email || '').trim();
}

function getLatestTransferReference() {
    var latest = state.latestCheckoutOrder;
    var bankConfig = getDisplayBankTransferConfig();
    var latestMethod = safeText(latest && latest.order && latest.order.paymentMethod).toLowerCase();
    if (latestMethod === 'bank_transfer') {
        return safeText(
            (latest && latest.bankTransfer && latest.bankTransfer.reference)
            || ([bankConfig.referencePrefix, latest && latest.order && latest.order.publicId].filter(Boolean).join('-'))
        ).trim();
    }
    return '';
}

function getTransferReferencePreview() {
    var reference = getLatestTransferReference();
    if (reference) return reference;

    var prefix = safeText(getDisplayBankTransferConfig().referencePrefix).trim() || 'LT';
    return prefix + '-{orderId}';
}

function renderPaymentBrandIcon(iconContainer, fallbackSvg, fallbackSrc, altText) {
    if (!iconContainer) return;

    var logoSource = safeText(iconContainer.getAttribute('data-logo-src') || fallbackSrc).trim();
    iconContainer.classList.remove('logo-ready');
    iconContainer.innerHTML = fallbackSvg;
    if (!logoSource) return;

    iconContainer.innerHTML = '';

    var logo = document.createElement('img');
    logo.className = 'payment-brand-logo';
    if (fallbackSrc === PAYPAL_LOGO_FALLBACK_SRC) {
        logo.classList.add('paypal-logo');
    }
    logo.alt = altText || '';
    logo.src = logoSource;
    logo.loading = 'lazy';
    logo.decoding = 'async';
    logo.addEventListener('load', function () {
        iconContainer.classList.add('logo-ready');
    });
    logo.addEventListener('error', function () {
        iconContainer.classList.remove('logo-ready');
        iconContainer.innerHTML = fallbackSvg;
    });

    iconContainer.appendChild(logo);
}

function renderPayPalBrandIcon(iconContainer) {
    renderPaymentBrandIcon(iconContainer, SVG.card, PAYPAL_LOGO_FALLBACK_SRC, 'PayPal');
}

function renderBankTransferBrandIcon(iconContainer) {
    renderPaymentBrandIcon(
        iconContainer,
        SVG.bank,
        BANK_TRANSFER_LOGO_FALLBACK_SRC,
        state.language === 'en' ? 'Bank transfer' : 'Transferencia bancaria'
    );
}

function triggerPrimaryCheckoutAction() {
    if (bookingSubmissionInProgress) return;

    var method = getSelectedPaymentMethod();
    if (method === 'bank_transfer') {
        startBankTransferCheckout();
        return;
    }
    startPayPalCheckout();
}

function normalizePaymentMethodLabel(method, feePercentOverride) {
    var value = safeText(method).toLowerCase();
    if (value === 'paypal') return getPaymentTitle('paypal', feePercentOverride);
    if (value === 'bank_transfer') return getPaymentTitle('bank_transfer', feePercentOverride);
    if (value === 'manual_contact') return t('paymentManual');
    return value ? value.replace(/_/g, ' ') : t('notSpecified');
}

function renderPaymentMethodCopy() {
    var paypalTitle = document.getElementById('payment-option-paypal-title');
    var paypalDesc = document.getElementById('payment-option-paypal-desc');
    var transferTitle = document.getElementById('payment-option-bank-transfer-title');
    var transferDesc = document.getElementById('payment-option-bank-transfer-desc');
    var paypalIcon = document.getElementById('payment-option-paypal-icon');
    var transferIcon = document.getElementById('payment-option-bank-transfer-icon');
    var transferFee = document.getElementById('payment-option-bank-transfer-fee');
    var paypalFee = document.getElementById('payment-option-paypal-fee');
    var payLabel = document.getElementById('pay-paypal-label');
    var mobilePayLabel = document.getElementById('confirm-mobile-pay-label');
    var transferFeeValue = getPaymentFeePercent('bank_transfer');
    var paypalFeeValue = getPaymentFeePercent('paypal');

    if (paypalTitle) paypalTitle.textContent = t('paymentPayPal');
    if (paypalDesc) paypalDesc.textContent = getPaymentDescription('paypal');
    if (transferTitle) transferTitle.textContent = t('paymentTransfer');
    if (transferDesc) transferDesc.textContent = getPaymentDescription('bank_transfer');
    renderPayPalBrandIcon(paypalIcon);
    renderBankTransferBrandIcon(transferIcon);
    if (transferFee) transferFee.textContent = transferFeeValue > 0 ? '+' + formatFeePercent(transferFeeValue) + '%' : t('noCommission');
    if (paypalFee) paypalFee.textContent = paypalFeeValue > 0 ? '+' + formatFeePercent(paypalFeeValue) + '%' : t('noCommission');
    if (isDemoModeEnabled() && paypalDesc) {
        paypalDesc.textContent = state.language === 'en'
            ? 'Demo mode. Opens the personal PayPal test link and never uses the company account.'
            : 'Modo demo. Abre el enlace personal de PayPal de prueba y no usa la cuenta de la empresa.';
    }
    if (payLabel) payLabel.textContent = getPayPalCtaLabel();
    if (mobilePayLabel) mobilePayLabel.textContent = getPrimaryCheckoutActionLabel(getSelectedPaymentMethod());
    renderCheckoutPaymentCards();
}

function normalizeStatusLabel(status) {
    var value = safeText(status).toLowerCase();
    if (value === 'paid') return t('adminStatusPaid');
    if (value === 'awaiting_transfer') return t('adminStatusAwaitingTransfer');
    if (value === 'transfer_submitted') return t('adminStatusTransferSubmitted');
    if (value === 'payment_authorized' || value === 'authorized') return t('adminStatusAuthorized');
    if (value === 'payment_cancelled' || value === 'cancelled') return t('adminStatusCancelled');
    if (value === 'payment_failed' || value === 'denied') return t('adminStatusFailed');
    if (value === 'voided' || value === 'payment_voided') return t('adminStatusVoid');
    if (value === 'pending_payment' || value === 'payment_pending' || value === 'pending_review' || value === 'pending_checkout' || value === 'created') return t('adminStatusPending');
    return value ? value.replace(/_/g, ' ') : t('notSpecified');
}

function toStatusClass(status) {
    var value = safeText(status).toLowerCase();
    if (value === 'paid') return 'status-paid';
    if (
        value === 'awaiting_transfer'
        || value === 'transfer_submitted'
        || value === 'payment_pending'
        || value === 'pending_payment'
        || value === 'payment_authorized'
        || value === 'authorized'
        || value === 'pending_review'
        || value === 'created'
        || value === 'pending_checkout'
    ) {
        return 'status-pending';
    }
    if (
        value === 'payment_failed'
        || value === 'denied'
        || value === 'voided'
        || value === 'payment_voided'
        || value === 'payment_cancelled'
        || value === 'cancelled'
    ) {
        return 'status-failed';
    }
    return '';
}

function getDateFormatByLanguage() {
    return state.language === 'en' ? 'm/d/Y' : 'd/m/Y';
}

function isCartModalActive() {
    var modal = document.getElementById('cart-modal');
    return Boolean(modal && modal.classList.contains('active'));
}

function getModalFocusableElements() {
    var dialog = document.getElementById('cart-modal-dialog');
    if (!dialog) return [];

    var selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.prototype.slice.call(dialog.querySelectorAll(selector)).filter(function (el) {
        return el.offsetParent !== null || document.activeElement === el;
    });
}

function trapCartModalFocus(event) {
    if (event.key !== 'Tab') return;
    var dialog = document.getElementById('cart-modal-dialog');
    if (!dialog) return;

    var focusable = getModalFocusableElements();
    if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;
    if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
    }

    if (event.shiftKey) {
        if (active === first) {
            event.preventDefault();
            last.focus();
        }
        return;
    }

    if (active === last) {
        event.preventDefault();
        first.focus();
    }
}

function focusCartModalPrimaryControl() {
    var dialog = document.getElementById('cart-modal-dialog');
    if (!dialog) return;

    var focusable = getModalFocusableElements();
    if (focusable.length > 0) {
        focusable[0].focus();
        return;
    }

    dialog.focus();
}

function hideBookingPreviews() {
    var whatsappPreview = document.getElementById('whatsapp-preview');
    var emailPreview = document.getElementById('email-preview');
    var whatsappContent = document.getElementById('whatsapp-message-content');
    var emailContent = document.getElementById('email-preview-content');

    if (whatsappPreview) whatsappPreview.style.display = 'none';
    if (emailPreview) emailPreview.style.display = 'none';
    if (whatsappContent) whatsappContent.textContent = '';
    if (emailContent) emailContent.replaceChildren();
}

function getTourForCartItem(item) {
    if (!item || !item.tourId) return null;
    return TOURS[item.tourId] || null;
}

function getCartItemName(item) {
    var tour = getTourForCartItem(item);
    if (tour && tour.hero && tour.hero.title) {
        return getLocalized(tour.hero.title, state.language);
    }
    if (item && item.name && typeof item.name === 'object') {
        return getLocalized(item.name, state.language);
    }
    return safeText(item && item.name);
}

function getCartItemAddonNames(item) {
    if (!item || !Array.isArray(item.addOns)) return [];

    var names = [];
    var tour = getTourForCartItem(item);
    item.addOns.forEach(function (addon) {
        if (!addon) return;
        var label = '';

        if (tour && tour.addOns && Array.isArray(tour.addOns.options) && addon.id) {
            var option = tour.addOns.options.find(function (opt) {
                return opt.id === addon.id;
            });
            if (option) {
                label = getLocalized(option.title, state.language);
            }
        }

        if (!label && addon.name && typeof addon.name === 'object') {
            label = getLocalized(addon.name, state.language);
        }
        if (!label) {
            label = safeText(addon.name || addon.id);
        }
        if (label) names.push(label);
    });

    return names;
}

function safePathSegment(segment) {
    return encodeURIComponent(String(segment || '').replace(/\\/g, '/'));
}

function encodePath(pathValue) {
    return String(pathValue || '')
        .split('/')
        .filter(function (segment) { return segment.length > 0; })
        .map(safePathSegment)
        .join('/');
}

function buildImageUrl(folder, imageRef) {
    var safeFolder = encodePath(folder);
    var ref = String(imageRef == null ? '' : imageRef).trim();
    if (/^\d+$/.test(ref)) {
        return safeFolder + '/' + ref + '.jpg';
    }
    return safeFolder + '/' + safePathSegment(ref);
}

function sanitizeImageUrl(url) {
    return String(url || '').replace(/[^a-zA-Z0-9/_%.-]/g, '');
}

function getLocalized(localized, lang) {
    if (!localized || typeof localized !== 'object') return safeText(localized);
    if (lang === 'en') return safeText(localized.en || localized.es || '');
    return safeText(localized.es || localized.en || '');
}

function getLocalizedPack(localized, lang) {
    return {
        es: escapeAttr(getLocalized(localized, 'es')),
        en: escapeAttr(getLocalized(localized, 'en')),
        text: escapeHtml(getLocalized(localized, lang))
    };
}

function cssEscapeValue(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(String(value));
    }
    return String(value).replace(/(["\\])/g, '\\$1');
}

function sanitizeSlugClient(input) {
    return String(input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function getTourCategory(tour) {
    var haystack = [
        safeText(tour && tour.id),
        getLocalized(tour && tour.card && tour.card.title, 'es'),
        getLocalized(tour && tour.card && tour.card.title, 'en'),
        getLocalized(tour && tour.card && tour.card.shortDescription, 'es'),
        getLocalized(tour && tour.card && tour.card.shortDescription, 'en')
    ].join(' ').toLowerCase();

    var key = 'adventure';

    if (/(market|shopping|downtown|mercado|compras|centro|city)/.test(haystack)) {
        key = 'city';
    } else if (/(atv|zipline|tirolesa|adventure|aventur|xcanche)/.test(haystack)) {
        key = 'adventure';
    } else if (/(snorkel|sea|ocean|mar|isla|catamaran|whale|shark|akumal|turtle|tortuga|playa|contoy)/.test(haystack)) {
        key = 'sea';
    } else if (/(tulum|chichen|coba|ek[\s_-]?balam|ruins|ruinas|maya|arqueol|archaeolog)/.test(haystack)) {
        key = 'ruins';
    } else if (/cenote/.test(haystack)) {
        key = 'adventure';
    }

    return TOUR_CATEGORY_META[key] || TOUR_CATEGORY_META.adventure;
}

function buildCommonsHeroSearchUrl(searchTerm) {
    var params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrnamespace: '6',
        gsrlimit: '8',
        gsrsearch: searchTerm,
        prop: 'imageinfo',
        iiprop: 'url|size',
        iiurlwidth: '2200'
    });
    return COMMONS_API_URL + '?' + params.toString();
}

function extractCommonsSlides(data) {
    if (!data || !data.query || !data.query.pages) return [];

    return Object.values(data.query.pages)
        .sort(function (a, b) {
            return safeInt(a && a.index, 9999) - safeInt(b && b.index, 9999);
        })
        .map(function (page) {
            var info = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
            if (!info) return null;

            var width = safeInt(info.width, 0);
            var height = safeInt(info.height, 0);
            var slideUrl = safeText(info.thumburl || info.url);

            if (!slideUrl || width < 1400 || width <= height) return null;
            if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(slideUrl)) return null;

            return slideUrl;
        })
        .filter(Boolean);
}

async function fetchCommonsSeaHeroSlides() {
    var requests = COMMONS_HERO_SEARCH_TERMS.map(function (term) {
        return fetch(buildCommonsHeroSearchUrl(term), { method: 'GET' })
            .then(function (response) {
                if (!response.ok) throw new Error('Commons request failed');
                return response.json();
            })
            .then(extractCommonsSlides)
            .catch(function () {
                return [];
            });
    });

    var results = await Promise.all(requests);
    return Array.from(new Set([].concat.apply([], results))).slice(0, 4);
}

function applyCatalogHeroSlides(layerA, layerB, slides) {
    var activeSlides = Array.isArray(slides) && slides.length > 0 ? slides : SEA_HERO_SLIDES.slice();

    clearInterval(heroRotationTimer);
    heroIndex = 0;

    layerA.style.backgroundImage = 'url("' + activeSlides[0] + '")';
    layerA.classList.add('active');
    layerB.classList.remove('active');

    if (activeSlides.length > 1) {
        layerB.style.backgroundImage = 'url("' + activeSlides[1] + '")';
    }

    if (prefersReducedMotion || activeSlides.length < 2) return;

    heroRotationTimer = setInterval(function () {
        var nextIndex = (heroIndex + 1) % activeSlides.length;
        var incomingLayer = layerA.classList.contains('active') ? layerB : layerA;
        var outgoingLayer = incomingLayer === layerA ? layerB : layerA;

        incomingLayer.style.backgroundImage = 'url("' + activeSlides[nextIndex] + '")';
        incomingLayer.classList.add('active');
        outgoingLayer.classList.remove('active');
        heroIndex = nextIndex;
    }, 7000);
}

function stopCheckoutHero() {
    clearInterval(checkoutHeroRotationTimer);
    checkoutHeroRotationTimer = null;
}

function setHeroLayerImage(layer, url) {
    if (!layer) return;
    var source = safeText(url).replace(/"/g, '%22');
    layer.style.backgroundImage = 'url("' + source + '")';
}

function renderCheckoutSeaGallery(slides) {
    var gallery = document.getElementById('checkout-sea-gallery');
    if (!gallery) return;

    var activeSlides = Array.isArray(slides) && slides.length > 0 ? slides : SEA_HERO_SLIDES.slice();
    gallery.replaceChildren();

    activeSlides.slice(0, 4).forEach(function (imageUrl) {
        var tile = document.createElement('span');
        tile.className = 'checkout-sea-image';
        setHeroLayerImage(tile, imageUrl);
        gallery.appendChild(tile);
    });
}

function applyCheckoutHeroSlides(slides) {
    var layerA = document.getElementById('checkout-hero-bg-a');
    var layerB = document.getElementById('checkout-hero-bg-b');
    if (!layerA || !layerB) return;

    var activeSlides = Array.isArray(slides) && slides.length > 0 ? slides : SEA_HERO_SLIDES.slice();

    stopCheckoutHero();
    checkoutHeroIndex = 0;

    setHeroLayerImage(layerA, activeSlides[0]);
    layerA.classList.add('active');
    layerB.classList.remove('active');

    if (activeSlides.length > 1) {
        setHeroLayerImage(layerB, activeSlides[1]);
    }

    renderCheckoutSeaGallery(activeSlides);

    if (prefersReducedMotion || activeSlides.length < 2) return;

    checkoutHeroRotationTimer = setInterval(function () {
        var nextIndex = (checkoutHeroIndex + 1) % activeSlides.length;
        var incomingLayer = layerA.classList.contains('active') ? layerB : layerA;
        var outgoingLayer = incomingLayer === layerA ? layerB : layerA;

        setHeroLayerImage(incomingLayer, activeSlides[nextIndex]);
        incomingLayer.classList.add('active');
        outgoingLayer.classList.remove('active');
        checkoutHeroIndex = nextIndex;
    }, 6500);
}

function initCheckoutHero() {
    if (Array.isArray(checkoutHeroRemoteSlides) && checkoutHeroRemoteSlides.length > 0) {
        applyCheckoutHeroSlides(checkoutHeroRemoteSlides);
        return;
    }

    applyCheckoutHeroSlides(SEA_HERO_SLIDES);
    fetchCommonsSeaHeroSlides()
        .then(function (remoteSlides) {
            if (!Array.isArray(remoteSlides) || remoteSlides.length === 0) return;
            checkoutHeroRemoteSlides = remoteSlides.slice(0, 4);
            applyCheckoutHeroSlides(checkoutHeroRemoteSlides);
        })
        .catch(function (error) {
            console.warn('initCheckoutHero error', error);
        });
}

function getAdminToken() {
    return sessionStorage.getItem('admin_token') || '';
}

function clearAdminSession() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_expires_at');
    sessionStorage.removeItem('admin_auth');
    adminOrdersState = {
        rows: [],
        selectedPublicId: '',
        detail: null
    };
}

function isAdminLoggedIn() {
    return Boolean(getAdminToken());
}

function readStoredCustomerAuthSession() {
    try {
        var raw = sessionStorage.getItem(CUSTOMER_AUTH_SESSION_KEY);
        if (!raw) return null;

        var session = JSON.parse(raw);
        if (!session || !session.token || !session.profile || !session.profile.publicId) return null;
        if (Date.parse(session.expiresAt || '') <= Date.now()) {
            sessionStorage.removeItem(CUSTOMER_AUTH_SESSION_KEY);
            return null;
        }
        return session;
    } catch (_) {
        sessionStorage.removeItem(CUSTOMER_AUTH_SESSION_KEY);
        return null;
    }
}

function getCustomerAuthSession() {
    if (
        customerAccountState.session
        && customerAccountState.session.expiresAt
        && Date.parse(customerAccountState.session.expiresAt) > Date.now()
    ) {
        return customerAccountState.session;
    }

    customerAccountState.session = readStoredCustomerAuthSession();
    if (customerAccountState.session) {
        customerAccountState.profile = customerAccountState.session.profile || null;
    }
    return customerAccountState.session;
}

function setCustomerAuthStatus(status, message) {
    setInlineStatus('customer-auth-status', status, message);
}

function setAuthModalStatus(status, message) {
    setInlineStatus('auth-modal-status', status, message);
}

function setInlineStatus(id, status, message) {
    var statusEl = document.getElementById(id);
    if (!statusEl) return;

    statusEl.classList.remove('loading', 'success', 'error');
    if (!status || status === 'idle') {
        statusEl.textContent = '';
        return;
    }

    statusEl.textContent = message || '';
    if (status === 'loading' || status === 'success' || status === 'error') {
        statusEl.classList.add(status);
    }
}

function renderCustomerAuthDebugCode(code) {
    if (code) {
        console.info('customer auth debug code', code);
    }
}

function getCustomerDisplayName(profile) {
    var source = profile || customerAccountState.profile || null;
    var fullName = safeText(source && source.fullName ? source.fullName : source && source.full_name).trim();
    if (fullName) return fullName;

    var email = safeText(source && source.email).trim();
    if (!email) return t('accountNav');
    return email.split('@')[0];
}

function getCustomerInitials(profile) {
    var name = getCustomerDisplayName(profile);
    var parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) return 'LT';
    return parts.map(function (part) {
        return part.charAt(0).toUpperCase();
    }).join('').slice(0, 2);
}

function syncCheckoutAccountPrefill() {
    var session = getCustomerAuthSession();
    var emailInput = document.getElementById('customer-email');
    var nameInput = document.getElementById('customer-name');

    if (emailInput) {
        if (session && session.profile && session.profile.email) {
            emailInput.value = session.profile.email;
            emailInput.readOnly = true;
        } else {
            emailInput.readOnly = false;
        }
    }

    if (nameInput && session && session.profile && session.profile.fullName && !nameInput.value.trim()) {
        nameInput.value = session.profile.fullName;
    }
}

function getCustomerAuthConfig() {
    return CONFIG.auth && CONFIG.auth.customer ? CONFIG.auth.customer : {};
}

function isGoogleSignInConfigured() {
    var authConfig = getCustomerAuthConfig();
    return Boolean(authConfig.googleEnabled && authConfig.googleClientId);
}

function getGoogleSignInHelperCopy() {
    return isGoogleSignInConfigured() ? t('authGoogleReadyHint') : t('authGoogleSetupHint');
}

function buildAccountGuestDetailEmptyState() {
    return ''
        + '<div class="account-empty-state">'
        + '<span class="account-empty-kicker">' + escapeHtml(t('accountGuestBadge')) + '</span>'
        + '<h3>' + escapeHtml(t('accountNav')) + '</h3>'
        + '<p>' + escapeHtml(t('accountGuestDetailEmpty')) + '</p>'
        + '<div class="account-empty-actions">'
        + '<button type="button" class="btn btn-primary" onclick="openAuthModal(\'login\')">' + escapeHtml(t('loginNav')) + '</button>'
        + '<button type="button" class="btn btn-secondary" onclick="navigateTo(\'catalog\')">' + escapeHtml(t('accountGuestBrowse')) + '</button>'
        + '</div>'
        + '</div>';
}

function syncCustomerAccountSummary() {
    var session = getCustomerAuthSession();
    var profile = session && session.profile ? session.profile : customerAccountState.profile;
    var hasProfile = Boolean(profile && (profile.email || profile.fullName || profile.full_name));
    var name = hasProfile ? getCustomerDisplayName(profile) : t('accountGuestProfileName');
    var email = hasProfile ? safeText(profile && profile.email).trim() : t('accountGuestProfileEmail');
    var ordersCount = session && Array.isArray(customerAccountState.orders) ? customerAccountState.orders.length : 0;
    var accountAvatar = document.getElementById('account-avatar');
    var profileName = document.getElementById('account-profile-name');
    var profileEmail = document.getElementById('account-profile-email');
    var summaryEmail = document.getElementById('account-summary-email');
    var summaryOrders = document.getElementById('account-summary-orders');
    var accountNavLabel = document.getElementById('account-nav-label');

    if (accountAvatar) accountAvatar.textContent = hasProfile ? getCustomerInitials(profile) : 'LT';
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (summaryEmail) summaryEmail.textContent = email;
    if (summaryOrders) summaryOrders.textContent = String(ordersCount);
    if (accountNavLabel) accountNavLabel.textContent = session ? name : t('accountNav');
}

function syncCustomerAuthForm() {
    var emailInput = document.getElementById('auth-email-input');
    var nameInput = document.getElementById('auth-full-name-input');
    var loginBtn = document.getElementById('auth-login-btn');
    var registerBtn = document.getElementById('auth-register-btn');
    var accountBtn = document.getElementById('account-nav-btn');
    var logoutBtn = document.getElementById('customer-auth-logout-btn');
    var summaryGrid = document.querySelector('.account-summary-grid');
    var accountActions = document.querySelector('.account-view-actions');
    var guestPanel = document.getElementById('account-guest-panel');
    var ordersPanel = document.getElementById('customer-orders-list-panel');
    var authGoogleNote = document.getElementById('auth-google-note');
    var accountGoogleStatus = document.getElementById('account-google-status');
    var session = getCustomerAuthSession();
    var portalSession = getCustomerPortalSession();
    var googleHelperCopy = getGoogleSignInHelperCopy();

    if (emailInput) {
        if (session && session.profile && session.profile.email) {
            emailInput.value = session.profile.email;
        } else if (!emailInput.value && portalSession && portalSession.email) {
            emailInput.value = portalSession.email;
        }
    }
    if (nameInput && session && session.profile && session.profile.fullName && !nameInput.value.trim()) {
        nameInput.value = session.profile.fullName;
    }

    if (loginBtn) loginBtn.hidden = Boolean(session);
    if (registerBtn) registerBtn.hidden = Boolean(session);
    if (accountBtn) accountBtn.hidden = !session;
    if (logoutBtn) logoutBtn.hidden = !session;
    if (summaryGrid) summaryGrid.hidden = !session;
    if (accountActions) accountActions.hidden = !session;
    if (guestPanel) guestPanel.hidden = Boolean(session);
    if (ordersPanel && !session) {
        ordersPanel.hidden = true;
        ordersPanel.innerHTML = '';
    }
    if (authGoogleNote) authGoogleNote.textContent = googleHelperCopy;
    if (accountGoogleStatus) accountGoogleStatus.textContent = googleHelperCopy;

    syncCustomerAccountSummary();
    syncCheckoutAccountPrefill();
}

function rememberCustomerAuthSession(result) {
    if (!result || !result.token || !result.profile || !result.profile.publicId) return null;

    var session = {
        token: safeText(result.token),
        expiresAt: safeText(result.expiresAt),
        profile: result.profile
    };

    customerAccountState.session = session;
    customerAccountState.profile = result.profile || null;
    try {
        sessionStorage.setItem(CUSTOMER_AUTH_SESSION_KEY, JSON.stringify(session));
    } catch (_) {
        // ignore storage failures
    }
    syncCustomerAuthForm();
    return session;
}

function isAuthModalOpen() {
    var modal = document.getElementById('auth-modal');
    return Boolean(modal && !modal.hidden);
}

function syncAuthModeUI() {
    var isLogin = authUIState.mode === 'login';
    var registerBtn = document.getElementById('auth-mode-register-btn');
    var loginBtn = document.getElementById('auth-mode-login-btn');
    var title = document.getElementById('auth-modal-title');
    var fullNameGroup = document.getElementById('auth-full-name-group');
    var confirmGroup = document.getElementById('auth-confirm-password-group');
    var passwordInput = document.getElementById('auth-password-input');
    var confirmInput = document.getElementById('auth-confirm-password-input');
    var submitBtn = document.getElementById('auth-submit-btn');

    if (registerBtn) registerBtn.classList.toggle('active', !isLogin);
    if (loginBtn) loginBtn.classList.toggle('active', isLogin);
    if (title) title.textContent = isLogin ? t('loginNav') : t('registerNav');
    if (fullNameGroup) fullNameGroup.hidden = isLogin;
    if (confirmGroup) confirmGroup.hidden = isLogin;
    if (confirmInput) confirmInput.required = !isLogin;
    if (passwordInput) passwordInput.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    if (submitBtn) submitBtn.textContent = isLogin ? t('loginNav') : t('registerNav');

    setAuthModalStatus('idle');
    syncCustomerAuthForm();
}

function openAuthModal(mode) {
    var modal = document.getElementById('auth-modal');
    var passwordInput = document.getElementById('auth-password-input');
    var confirmInput = document.getElementById('auth-confirm-password-input');
    var focusTargetId = mode === 'register' ? 'auth-full-name-input' : 'auth-email-input';
    var wasOpen = isAuthModalOpen();

    if (!modal) return;

    if (!wasOpen && document.activeElement && document.activeElement !== document.body) {
        lastFocusedBeforeAuthModal = document.activeElement;
    }

    authUIState.mode = mode === 'register' ? 'register' : 'login';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (passwordInput) passwordInput.value = '';
    if (confirmInput) confirmInput.value = '';

    syncAuthModeUI();

    window.requestAnimationFrame(function () {
        ensureGoogleSignInUI();
        var focusTarget = document.getElementById(focusTargetId) || document.getElementById('auth-email-input');
        if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    });
}

function closeAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    var passwordInput = document.getElementById('auth-password-input');
    var confirmInput = document.getElementById('auth-confirm-password-input');

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    authUIState.busy = false;
    setAuthModalStatus('idle');
    if (passwordInput) passwordInput.value = '';
    if (confirmInput) confirmInput.value = '';
    if (lastFocusedBeforeAuthModal && document.contains(lastFocusedBeforeAuthModal)) {
        lastFocusedBeforeAuthModal.focus();
    }
    lastFocusedBeforeAuthModal = null;
}

function switchAuthMode(mode) {
    authUIState.mode = mode === 'login' ? 'login' : 'register';
    syncAuthModeUI();
    ensureGoogleSignInUI();
}

function showGoogleUnavailableMessage(context) {
    var configured = isGoogleSignInConfigured();
    var message = configured ? t('authGoogleLoading') : t('authGoogleSetupHint');
    if (context === 'account') {
        var accountGoogleStatus = document.getElementById('account-google-status');
        if (accountGoogleStatus) accountGoogleStatus.textContent = message;
        showToast('info', t('accountNav'), message);
        ensureGoogleSignInUI();
        return;
    }

    setAuthModalStatus(configured ? 'loading' : 'error', message);
    ensureGoogleSignInUI();
}

function getGoogleSignInTargets() {
    return [
        {
            container: document.getElementById('google-signin-primary'),
            fallback: document.getElementById('google-fallback-primary'),
            minWidth: 240,
            maxWidth: 420
        },
        {
            container: document.getElementById('google-signin-account'),
            fallback: document.getElementById('google-fallback-account'),
            minWidth: 240,
            maxWidth: 360
        }
    ];
}

function resetGoogleSignInTargets(targets) {
    targets.forEach(function (target) {
        if (!target || !target.container) return;
        target.container.innerHTML = '';
        target.container.dataset.googleRendered = 'false';
    });
}

function ensureGoogleSignInUI() {
    var authConfig = getCustomerAuthConfig();
    var targets = getGoogleSignInTargets();
    var primary = document.getElementById('google-signin-primary');
    if (!primary && !document.getElementById('google-signin-account')) return false;

    targets.forEach(function (target) {
        if (target && target.fallback) {
            target.fallback.classList.toggle('is-pending', !(authConfig.googleEnabled && authConfig.googleClientId));
        }
    });

    if (!authConfig.googleEnabled || !authConfig.googleClientId) {
        targets.forEach(function (target) {
            if (target && target.fallback) target.fallback.hidden = false;
        });
        resetGoogleSignInTargets(targets);
        googleIdentityInitialized = false;
        return false;
    }

    if (!(window.google && google.accounts && google.accounts.id)) {
        targets.forEach(function (target) {
            if (target && target.fallback) target.fallback.hidden = false;
        });
        window.setTimeout(function () {
            if (isAuthModalOpen() || state.currentView === 'account') ensureGoogleSignInUI();
        }, 400);
        return false;
    }

    if (!googleIdentityInitialized) {
        google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        googleIdentityInitialized = true;
    }

    targets.forEach(function (target) {
        if (target && target.fallback) target.fallback.hidden = true;
        if (!target || !target.container || target.container.dataset.googleRendered === 'true') return;
        target.container.innerHTML = '';
        google.accounts.id.renderButton(target.container, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: Math.max(target.minWidth, Math.min(target.maxWidth, target.container.clientWidth || target.maxWidth))
        });
        target.container.dataset.googleRendered = 'true';
    });
    return true;
}

function normalizeStoredCartItem(item) {
    if (!item || !item.tourId) return null;

    var addOns = Array.isArray(item.addOns) ? item.addOns.map(function (entry) {
        if (entry && typeof entry === 'object') {
            return {
                id: safeText(entry.id || entry.slug).trim(),
                name: safeText(entry.name).trim(),
                pricePerPerson: safeInt(entry.pricePerPerson, 0)
            };
        }
        return {
            id: safeText(entry).trim(),
            name: '',
            pricePerPerson: 0
        };
    }).filter(function (entry) {
        return entry.id;
    }) : [];

    return {
        id: safeText(item.id).trim() || (safeText(item.tourId).trim() + '-' + Date.now()),
        tourId: safeText(item.tourId).trim(),
        name: safeText(item.name).trim(),
        image: safeText(item.image).trim(),
        adults: Math.max(0, safeInt(item.adults, 0)),
        children: Math.max(0, safeInt(item.children, 0)),
        adultPriceUSD: safeInt(item.adultPriceUSD, 0),
        childPriceUSD: safeInt(item.childPriceUSD, 0),
        addOns: addOns,
        subtotalUSD: safeInt(item.subtotalUSD, 0)
    };
}

function buildCartItemSignature(item) {
    var normalized = normalizeStoredCartItem(item);
    if (!normalized) return '';
    var addOns = normalized.addOns.map(function (entry) {
        return entry.id;
    }).sort().join(',');
    return [
        normalized.tourId,
        normalized.adults,
        normalized.children,
        addOns
    ].join('|');
}

function mergeCartCollections(primary, secondary) {
    var seen = {};
    var merged = [];

    [primary, secondary].forEach(function (collection) {
        if (!Array.isArray(collection)) return;
        collection.forEach(function (item) {
            var normalized = normalizeStoredCartItem(item);
            var signature = buildCartItemSignature(normalized);
            if (!normalized || !signature || seen[signature]) return;
            seen[signature] = true;
            merged.push(normalized);
        });
    });

    return merged;
}

function mergeAuthenticatedCart(remoteCart, profilePublicId) {
    var localCart = Array.isArray(state.cart) ? state.cart : [];
    var canMergeLocal = !localCartOwner || localCartOwner === 'guest' || localCartOwner === profilePublicId;
    var merged = mergeCartCollections(Array.isArray(remoteCart) ? remoteCart : [], canMergeLocal ? localCart : []);
    state.cart = merged;
    localCartOwner = profilePublicId || 'guest';
    saveState();
    updateCartUI();
    return merged;
}

async function syncCustomerCartNow() {
    var session = getCustomerAuthSession();
    if (!session || !session.token) return null;

    var response = await customerAuthFetch('/api/me/cart', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            cart: state.cart
        })
    });
    var result = await response.json().catch(function () { return {}; });
    if (!response.ok || (result && result.error)) {
        throw new Error(result && result.error ? result.error : t('adminActionFailed'));
    }
    return result;
}

function scheduleCustomerCartSync() {
    if (!getCustomerAuthSession()) return;
    window.clearTimeout(customerCartSyncTimer);
    customerCartSyncTimer = window.setTimeout(function () {
        syncCustomerCartNow().catch(function (error) {
            console.warn('syncCustomerCartNow error', error);
        });
    }, 300);
}

async function completeCustomerAuthentication(result, successMessage) {
    var session = rememberCustomerAuthSession(result);
    if (!session || !session.profile) {
        throw new Error(t('authInvalidCredentials'));
    }

    mergeAuthenticatedCart(result && result.cart, session.profile.publicId);
    await loadCustomerAccountOrders({ silent: true, autoSelect: true });
    syncCustomerAuthForm();
    closeAuthModal();
    setCustomerAuthStatus('success', successMessage || t('authLoginSuccess'));
    showToast('success', t('accountNav'), successMessage || t('authLoginSuccess'));
    navigateTo('account');
}

async function restoreCustomerSession() {
    var session = getCustomerAuthSession();
    if (!session) {
        syncCustomerAuthForm();
        return null;
    }

    try {
        var response = await customerAuthFetch('/api/me');
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('sessionExpiredMessage'));
        }

        rememberCustomerAuthSession({
            token: session.token,
            expiresAt: result.session && result.session.expiresAt ? result.session.expiresAt : session.expiresAt,
            profile: result.profile || session.profile
        });
        mergeAuthenticatedCart(result.cart, session.profile.publicId);
        await loadCustomerAccountOrders({ silent: true, autoSelect: true });
        setCustomerAuthStatus('success', t('accountRestored'));
        return result;
    } catch (error) {
        console.warn('restoreCustomerSession error', error);
        clearCustomerAuthSession(false);
        return null;
    }
}

async function submitCustomerAuth(event) {
    if (event) event.preventDefault();
    if (authUIState.busy) return;

    var mode = authUIState.mode === 'login' ? 'login' : 'register';
    var nameInput = document.getElementById('auth-full-name-input');
    var emailInput = document.getElementById('auth-email-input');
    var passwordInput = document.getElementById('auth-password-input');
    var confirmInput = document.getElementById('auth-confirm-password-input');
    var submitBtn = document.getElementById('auth-submit-btn');
    var payload = {
        fullName: safeText(nameInput && nameInput.value).trim(),
        email: safeText(emailInput && emailInput.value).trim().toLowerCase(),
        password: passwordInput ? passwordInput.value : ''
    };

    if (!payload.email) {
        setAuthModalStatus('error', t('authEmailRequired'));
        return;
    }
    if (!payload.password || payload.password.length < 8) {
        setAuthModalStatus('error', t('authPasswordRules'));
        return;
    }
    if (mode === 'register' && payload.password !== (confirmInput ? confirmInput.value : '')) {
        setAuthModalStatus('error', t('authPasswordMismatch'));
        return;
    }

    authUIState.busy = true;
    if (submitBtn) submitBtn.classList.add('loading');
    setAuthModalStatus('loading', t('portalLoading'));

    try {
        var response = await fetch(mode === 'login' ? '/api/auth/customer/login' : '/api/auth/customer/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : (mode === 'login' ? t('authInvalidCredentials') : t('authAccountExists')));
        }

        await completeCustomerAuthentication(result, mode === 'login' ? t('authLoginSuccess') : t('authRegisterSuccess'));
    } catch (error) {
        console.error(error);
        setAuthModalStatus('error', error.message || t('authInvalidCredentials'));
    } finally {
        authUIState.busy = false;
        if (submitBtn) submitBtn.classList.remove('loading');
    }
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
        setAuthModalStatus('error', t('authGoogleError'));
        return;
    }

    authUIState.busy = true;
    setAuthModalStatus('loading', t('portalLoading'));
    try {
        var apiResponse = await fetch('/api/auth/customer/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: response.credential
            })
        });
        var result = await apiResponse.json().catch(function () { return {}; });
        if (!apiResponse.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('authGoogleError'));
        }

        await completeCustomerAuthentication(result, t('authLoginSuccess'));
    } catch (error) {
        console.error(error);
        setAuthModalStatus('error', error.message || t('authGoogleError'));
    } finally {
        authUIState.busy = false;
    }
}

function initAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeAuthModal();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isAuthModalOpen()) {
            event.preventDefault();
            closeAuthModal();
        }
    });

    syncAuthModeUI();
}

function clearCustomerOrdersList() {
    var panel = document.getElementById('customer-orders-list-panel');
    if (!panel) return;

    if (!getCustomerAuthSession()) {
        panel.hidden = true;
        panel.innerHTML = '';
        return;
    }

    panel.hidden = false;
    panel.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('customerOrdersEmpty')) + '</p>';
    syncCustomerAccountSummary();
}

function clearCustomerAuthSession(shouldToast) {
    window.clearTimeout(customerCartSyncTimer);
    customerAccountState.session = null;
    customerAccountState.profile = null;
    customerAccountState.orders = [];
    customerAccountState.selectedPublicId = '';
    localCartOwner = 'guest';
    state.cart = [];
    sessionStorage.removeItem(CUSTOMER_AUTH_SESSION_KEY);
    saveState();
    updateCartUI();
    syncCustomerAuthForm();
    clearCustomerOrdersList();
    setCustomerAuthStatus('idle');
    setAuthModalStatus('idle');
    renderCustomerAuthDebugCode('');

    if (customerPortalState.source === 'account') {
        customerPortalState.data = null;
        customerPortalState.source = 'portal';
        clearCustomerPortalResult();
    }

    if (state.currentView === 'account') {
        syncCustomerAuthForm();
        renderCustomerAccountOrders();
        clearCustomerPortalResult();
    }

    if (shouldToast) {
        showToast('info', t('myOrdersTitle'), t('customerLoggedOut'));
    }
}

async function customerAuthFetch(url, options) {
    var session = getCustomerAuthSession();
    if (!session || !session.token) {
        throw new Error(t('portalSessionExpired'));
    }

    var init = options || {};
    var headers = new Headers(init.headers || {});
    headers.set('Authorization', 'Bearer ' + session.token);

    var response = await fetch(url, Object.assign({}, init, { headers: headers }));
    if (response.status === 401) {
        clearCustomerAuthSession(false);
        throw new Error(t('portalSessionExpired'));
    }

    return response;
}

function readStoredCustomerPortalSession() {
    try {
        var raw = sessionStorage.getItem(CUSTOMER_PORTAL_SESSION_KEY);
        if (!raw) return null;

        var session = JSON.parse(raw);
        if (!session || !session.publicId || !session.token) return null;
        if (safeInt(session.expiresAt, 0) <= Date.now()) {
            sessionStorage.removeItem(CUSTOMER_PORTAL_SESSION_KEY);
            return null;
        }

        return {
            publicId: safeText(session.publicId),
            token: safeText(session.token),
            expiresAt: safeInt(session.expiresAt, 0),
            email: safeText(session.email).toLowerCase()
        };
    } catch (_) {
        sessionStorage.removeItem(CUSTOMER_PORTAL_SESSION_KEY);
        return null;
    }
}

function getCustomerPortalSession() {
    if (customerPortalState.session && safeInt(customerPortalState.session.expiresAt, 0) > Date.now()) {
        return customerPortalState.session;
    }

    customerPortalState.session = readStoredCustomerPortalSession();
    return customerPortalState.session;
}

function rememberCustomerPortalSession(publicId, portal, email) {
    if (!publicId || !portal || !portal.token) return null;

    var session = {
        publicId: safeText(publicId),
        token: safeText(portal.token),
        expiresAt: safeInt(portal.expiresAt, Date.now() + 1000 * 60 * 30),
        email: safeText(email).toLowerCase()
    };

    customerPortalState.session = session;
    try {
        sessionStorage.setItem(CUSTOMER_PORTAL_SESSION_KEY, JSON.stringify(session));
    } catch (_) {
        // ignore storage failures
    }
    syncCustomerPortalLookupForm();
    return session;
}

function ensureCustomerPortalSessionForOrder(publicId) {
    var session = getCustomerPortalSession();
    if (session && session.publicId === publicId) return session;

    if (
        state.latestCheckoutOrder
        && state.latestCheckoutOrder.order
        && state.latestCheckoutOrder.portal
        && state.latestCheckoutOrder.order.publicId === publicId
    ) {
        return rememberCustomerPortalSession(
            publicId,
            state.latestCheckoutOrder.portal,
            state.latestCheckoutOrder.lookupEmail
        );
    }

    return null;
}

function setOrderLookupStatus(status, message) {
    var statusEl = document.getElementById('order-lookup-status');
    if (!statusEl) return;

    statusEl.classList.remove('loading', 'success', 'error');
    if (!status || status === 'idle') {
        statusEl.textContent = '';
        return;
    }

    statusEl.textContent = message || '';
    if (status === 'loading' || status === 'success' || status === 'error') {
        statusEl.classList.add(status);
    }
}

function clearCustomerPortalResult() {
    var container = document.getElementById('orders-portal-result');
    if (!container) return;

    if (state.currentView === 'account' && !getCustomerAuthSession()) {
        container.innerHTML = buildAccountGuestDetailEmptyState();
        return;
    }

    var key = customerPortalState.source === 'account' || state.currentView === 'account'
        ? 'accountOrdersEmptyState'
        : 'myOrdersEmpty';
    container.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t(key)) + '</p>';
}

function syncCustomerPortalLookupForm() {
    var form = document.getElementById('order-lookup-form');
    var publicIdInput = document.getElementById('order-lookup-public-id');
    var emailInput = document.getElementById('order-lookup-email');
    var session = getCustomerPortalSession();

    if (!publicIdInput || !emailInput) return;
    if (!session) {
        if (form) form.reset();
        return;
    }

    publicIdInput.value = safeText(session.publicId);
    if (session.email) emailInput.value = session.email;
}

function clearCustomerPortalSession(shouldToast) {
    customerPortalState.session = null;
    if (customerPortalState.source === 'portal') {
        customerPortalState.data = null;
    }
    sessionStorage.removeItem(CUSTOMER_PORTAL_SESSION_KEY);
    syncCustomerPortalLookupForm();
    if (customerPortalState.source === 'portal') {
        clearCustomerPortalResult();
    }
    setOrderLookupStatus('idle');

    if (shouldToast) {
        showToast('info', t('myOrdersTitle'), t('portalSessionCleared'));
    }
}

async function customerPortalFetch(url, options) {
    var session = getCustomerPortalSession();
    if (!session) {
        throw new Error(t('portalSessionExpired'));
    }

    var init = options || {};
    var headers = new Headers(init.headers || {});
    headers.set('Authorization', 'Bearer ' + session.token);

    var response = await fetch(url, Object.assign({}, init, { headers: headers }));
    if (response.status === 401 || response.status === 403) {
        clearCustomerPortalSession(false);
        throw new Error(t('portalSessionExpired'));
    }

    return response;
}

function buildPortalDetailList(items) {
    return items.map(function (item) {
        return '<div class="orders-portal-item"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></div>';
    }).join('');
}

function extractDownloadFilename(response, fallback) {
    var header = response.headers.get('content-disposition') || '';
    var utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    var basicMatch = header.match(/filename=\"?([^\";]+)\"?/i);
    if (basicMatch && basicMatch[1]) {
        return basicMatch[1];
    }

    return fallback;
}

function canUploadTransferProofFromPortal(data) {
    if (!data || !data.order) return false;
    if (safeText(data.order.paymentMethod).toLowerCase() !== 'bank_transfer') return false;
    return safeText(data.order.status).toLowerCase() !== 'paid';
}

function getActiveCustomerOrderAccess(publicId) {
    var normalizedPublicId = safeText(publicId);
    var authSession = getCustomerAuthSession();
    if (
        customerPortalState.source === 'account'
        && authSession
        && customerPortalState.data
        && customerPortalState.data.order
        && customerPortalState.data.order.publicId === normalizedPublicId
    ) {
        return {
            type: 'account',
            headers: {
                Authorization: 'Bearer ' + authSession.token
            },
            documentPath: '/api/me/orders/' + encodeURIComponent(normalizedPublicId) + '/documents/',
            transferPath: '/api/me/orders/' + encodeURIComponent(normalizedPublicId) + '/transfer-proof',
            expiresAt: authSession.expiresAt
        };
    }

    var portalSession = ensureCustomerPortalSessionForOrder(normalizedPublicId);
    if (!portalSession) return null;
    return {
        type: 'portal',
        headers: {
            Authorization: 'Bearer ' + portalSession.token
        },
        documentPath: '/api/orders/' + encodeURIComponent(normalizedPublicId) + '/documents/',
        transferPath: '/api/orders/' + encodeURIComponent(normalizedPublicId) + '/transfer-proof',
        expiresAt: portalSession.expiresAt
    };
}

function buildPricingDetailItems(record) {
    var feePercent = roundCurrencyAmount(record && record.feePercent);
    var totalValue = record && (record.totalFinal != null ? record.totalFinal : (record.total != null ? record.total : record.amount));
    return [
        { label: t('subtotal'), value: formatCurrency(record && record.subtotal, record && record.currency) },
        { label: t('commission') + (feePercent > 0 ? ' (+' + formatFeePercent(feePercent) + '%)' : ''), value: feePercent > 0 ? formatCurrency(record && record.feeAmount, record && record.currency) : t('noCommission') },
        { label: t('totalFinal'), value: formatCurrency(totalValue, record && record.currency) }
    ];
}

function renderCustomerPortalResult() {
    var container = document.getElementById('orders-portal-result');
    if (!container) return;

    var detail = customerPortalState.data;
    var session = customerPortalState.source === 'account' ? getCustomerAuthSession() : getCustomerPortalSession();
    if (!detail || !detail.order) {
        clearCustomerPortalResult();
        return;
    }

    var order = detail.order;
    var payment = detail.payment || null;
    var items = Array.isArray(detail.items) ? detail.items : [];
    var documents = Array.isArray(detail.documents) ? detail.documents : [];
    var transferSubmissions = Array.isArray(detail.transferSubmissions) ? detail.transferSubmissions : [];

    var itemsHtml = items.length === 0
        ? '<p class="admin-orders-empty">' + escapeHtml(t('cartEmpty')) + '</p>'
        : items.map(function (item) {
            var title = state.language === 'en'
                ? safeText(item.titleEn || item.titleEs || item.tourSlug)
                : safeText(item.titleEs || item.titleEn || item.tourSlug);
            var addOns = Array.isArray(item.addOns) ? item.addOns : [];
            var travelers = safeInt(item.adults, 0) + ' ' + t('adultUnit') + ', ' + safeInt(item.children, 0) + ' ' + t('childUnit');
            if (addOns.length > 0) {
                travelers += ' + ' + addOns.map(function (addOn) {
                    return safeText(addOn.id || addOn.slug || addOn.name || 'add-on');
                }).join(', ');
            }

            return ''
                + '<div class="orders-portal-service">'
                + '<strong>' + escapeHtml(title) + '</strong>'
                + '<p>' + escapeHtml(travelers) + '</p>'
                + '<p>' + escapeHtml((item.serviceDate || order.serviceDate || t('notSpecified')) + ' • ' + formatCurrency(item.subtotal, order.currency)) + '</p>'
                + '</div>';
        }).join('');

    var documentsHtml = documents.length === 0
        ? '<p class="admin-orders-empty">' + escapeHtml(t('portalNoDocuments')) + '</p>'
        : documents.map(function (document) {
            return ''
                + '<div class="orders-portal-document">'
                + '<strong>' + escapeHtml(safeText(document.document_type).replace(/_/g, ' ')) + '</strong>'
                + '<p>' + escapeHtml(formatDateTime(document.created_at)) + '</p>'
                + '<p><button type="button" class="btn btn-secondary" onclick="downloadCustomerDocument(' + safeInt(document.id, 0) + ')">' + escapeHtml(t('portalDownloadDocument')) + '</button></p>'
                + '</div>';
        }).join('');

    var transfersHtml = transferSubmissions.length === 0
        ? '<p class="admin-orders-empty">' + escapeHtml(t('portalNoTransfers')) + '</p>'
        : transferSubmissions.map(function (submission) {
            return ''
                + '<div class="orders-portal-document">'
                + '<strong>' + escapeHtml(normalizeStatusLabel(submission.review_status || 'pending')) + '</strong>'
                + '<p>' + escapeHtml(t('adminMatchScore') + ': ' + safeInt(submission.match_score, 0)) + '</p>'
                + '<p>' + escapeHtml(t('portalSubmittedAt') + ': ' + formatDateTime(submission.created_at)) + '</p>'
                + '<p>' + escapeHtml(t('adminReviewedBy') + ': ' + (submission.reviewed_by || t('notSpecified'))) + '</p>'
                + '</div>';
        }).join('');

    var transferUploadHtml = canUploadTransferProofFromPortal(detail) ? ''
        + '<div class="transfer-proof-box">'
        + '<h6>' + escapeHtml(t('uploadProofTitle')) + '</h6>'
        + '<p>' + escapeHtml(t('uploadProofHelp')) + '</p>'
        + '<div class="transfer-proof-fields">'
        + '<input type="file" id="portal-transfer-proof-file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf">'
        + '<button type="button" class="btn btn-secondary" id="portal-upload-transfer-proof-btn" onclick="uploadCustomerPortalTransferProof()">'
        + escapeHtml(t('uploadProofButton'))
        + '</button>'
        + '</div>'
        + '</div>'
        : '';

    container.innerHTML = ''
        + '<div class="orders-portal-header">'
        + '<div><h3>' + escapeHtml(order.publicId) + '</h3><p>' + escapeHtml(formatDateTime(order.createdAt)) + '</p></div>'
        + '<div class="admin-order-row-meta">'
        + '<span class="admin-order-chip ' + escapeAttr(toStatusClass(order.status)) + '">' + escapeHtml(normalizeStatusLabel(order.status)) + '</span>'
        + (payment ? '<span class="admin-order-chip ' + escapeAttr(toStatusClass(payment.status)) + '">' + escapeHtml(normalizeStatusLabel(payment.status)) + '</span>' : '')
        + '</div>'
        + '</div>'
        + (session ? '<div class="orders-portal-note"><strong>' + escapeHtml(t('portalSessionExpires')) + '</strong><p>' + escapeHtml(formatDateTime(session.expiresAt)) + '</p></div>' : '')
        + '<div class="orders-portal-grid">'
        + '<div class="orders-portal-panel"><h4>' + escapeHtml(t('portalOrderSummary')) + '</h4><div class="orders-portal-list">' + buildPortalDetailList([
            { label: t('name'), value: order.guestName || t('notSpecified') },
            { label: t('email'), value: order.guestEmail || t('notSpecified') },
            { label: t('phone'), value: order.guestPhone || t('notSpecified') },
            { label: t('adminOrderStatus'), value: normalizeStatusLabel(order.status) },
            { label: t('tourDate'), value: order.serviceDate || t('notSpecified') },
            { label: t('pickupTime'), value: order.pickupTime || t('notSpecified') },
            { label: t('hotel'), value: order.hotel || t('notSpecified') },
            { label: t('comments'), value: order.comments || t('noComments') }
        ].concat(buildPricingDetailItems(order))) + '</div></div>'
        + '<div class="orders-portal-panel"><h4>' + escapeHtml(t('portalPaymentSummary')) + '</h4><div class="orders-portal-list">' + buildPortalDetailList([
            { label: t('paymentMethod'), value: normalizePaymentMethodLabel(order.paymentMethod, order.feePercent) },
            { label: t('portalPaymentProvider'), value: payment ? normalizePaymentMethodLabel(payment.provider, payment.feePercent) : normalizePaymentMethodLabel(order.paymentMethod, order.feePercent) },
            { label: t('adminPaymentStatus'), value: payment ? normalizeStatusLabel(payment.status) : normalizeStatusLabel(order.status) },
            { label: t('adminProviderStatus'), value: (payment && payment.providerStatus) || order.providerStatus || t('notSpecified') },
            { label: t('reference'), value: order.bankReference || t('notSpecified') },
            { label: t('expiresAt'), value: formatDateTime(order.expiresAt) }
        ].concat(payment ? buildPricingDetailItems(payment) : []).concat(detail.bankTransfer ? [
            { label: t('bankName'), value: detail.bankTransfer.bankName || t('notSpecified') },
            { label: t('beneficiary'), value: detail.bankTransfer.beneficiary || t('notSpecified') },
            { label: t('clabe'), value: detail.bankTransfer.clabe || t('notSpecified') },
            { label: t('account'), value: detail.bankTransfer.account || t('notSpecified') },
            { label: t('depositCard'), value: detail.bankTransfer.cardNumber || t('notSpecified') }
        ] : [])) + '</div></div>'
        + '</div>'
        + '<div class="orders-portal-panel"><h4>' + escapeHtml(t('portalServicesTitle')) + '</h4><div class="orders-portal-services">' + itemsHtml + '</div></div>'
        + '<div class="orders-portal-grid">'
        + '<div class="orders-portal-panel"><h4>' + escapeHtml(t('portalDocumentsTitle')) + '</h4><div class="orders-portal-documents">' + documentsHtml + '</div></div>'
        + '<div class="orders-portal-panel"><h4>' + escapeHtml(t('portalTransfersTitle')) + '</h4><div class="orders-portal-documents">' + transfersHtml + '</div>' + transferUploadHtml + '</div>'
        + '</div>';
}

async function loadCustomerPortalDetail(options) {
    var opts = Object.assign({ silent: false }, options || {});
    var session = getCustomerPortalSession();
    if (!session) {
        customerPortalState.data = null;
        clearCustomerPortalResult();
        if (!opts.silent) setOrderLookupStatus('error', t('portalSessionExpired'));
        return null;
    }

    if (!opts.silent) {
        setOrderLookupStatus('loading', t('portalLoading'));
    }

    try {
        var response = await customerPortalFetch('/api/orders/' + encodeURIComponent(session.publicId) + '/portal');
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('portalLookupError'));
        }

        if (result && result.portal && result.portal.expiresAt) {
            rememberCustomerPortalSession(session.publicId, {
                token: session.token,
                expiresAt: result.portal.expiresAt
            }, session.email);
        }

        customerPortalState.data = result.data || null;
        customerPortalState.source = 'portal';
        renderCustomerPortalResult();
        if (!opts.silent) setOrderLookupStatus('success', t('portalLookupSuccess'));
        return result;
    } catch (error) {
        customerPortalState.data = null;
        clearCustomerPortalResult();
        setOrderLookupStatus('error', error.message || t('portalLookupError'));
        throw error;
    }
}

async function handleOrderLookup(event) {
    if (event) event.preventDefault();

    var publicIdInput = document.getElementById('order-lookup-public-id');
    var emailInput = document.getElementById('order-lookup-email');
    if (!publicIdInput || !emailInput) return;

    var publicId = safeText(publicIdInput.value).trim().toUpperCase();
    var email = safeText(emailInput.value).trim().toLowerCase();
    if (!publicId || !email) return;

    publicIdInput.value = publicId;
    emailInput.value = email;
    setOrderLookupStatus('loading', t('portalLoading'));

    try {
        var response = await fetch('/api/orders/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                publicId: publicId,
                email: email
            })
        });
        var result = await response.json().catch(function () { return {}; });

        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('portalLookupError'));
        }

        rememberCustomerPortalSession(publicId, result.portal, email);
        customerPortalState.data = result.data || null;
        customerPortalState.source = 'portal';
        renderCustomerPortalResult();
        setOrderLookupStatus('success', t('portalLookupSuccess'));
    } catch (error) {
        customerPortalState.data = null;
        clearCustomerPortalResult();
        setOrderLookupStatus('error', error.message || t('portalLookupError'));
    }
}

function renderCustomerAccountOrders() {
    var panel = document.getElementById('customer-orders-list-panel');
    if (!panel) return;

    var session = getCustomerAuthSession();
    if (!session) {
        clearCustomerOrdersList();
        return;
    }

    panel.hidden = false;
    var orders = Array.isArray(customerAccountState.orders) ? customerAccountState.orders : [];
    if (orders.length === 0) {
        panel.innerHTML = ''
            + '<div class="orders-portal-header">'
            + '<div><h3>' + escapeHtml(t('customerOrdersTitle')) + '</h3><p>' + escapeHtml(t('customerOrdersHint')) + '</p></div>'
            + '</div>'
            + '<p class="admin-orders-empty">' + escapeHtml(t('customerOrdersEmpty')) + '</p>';
        syncCustomerAccountSummary();
        return;
    }

    var html = ''
        + '<div class="orders-portal-header">'
        + '<div><h3>' + escapeHtml(t('customerOrdersTitle')) + '</h3><p>' + escapeHtml(t('customerOrdersHint')) + '</p></div>'
        + '<div class="admin-order-row-meta"><span class="admin-order-chip">' + escapeHtml(String(orders.length)) + '</span></div>'
        + '</div>';

    orders.forEach(function (order) {
        var activeClass = order.publicId === customerAccountState.selectedPublicId ? ' active' : '';
        html += '<button type="button" class="admin-order-row' + activeClass + '" onclick="selectCustomerAccountOrder(\'' + escapeAttr(order.publicId) + '\')">';
        html += '<div class="admin-order-row-top">';
        html += '<div><div class="admin-order-row-id">' + escapeHtml(order.publicId) + '</div><div class="admin-order-row-name">' + escapeHtml(order.guestName || order.guestEmail || '') + '</div></div>';
        html += '<div class="admin-order-row-total">' + escapeHtml(formatCurrency(order.total, order.currency)) + '</div>';
        html += '</div>';
        html += '<div class="admin-order-row-bottom">';
        html += '<div class="admin-order-row-meta">';
        html += '<span class="admin-order-chip ' + escapeAttr(toStatusClass(order.status)) + '">' + escapeHtml(normalizeStatusLabel(order.status)) + '</span>';
        html += '<span class="admin-order-chip">' + escapeHtml(normalizePaymentMethodLabel(order.paymentMethod, order.feePercent)) + '</span>';
        html += '</div>';
        html += '<div class="admin-order-row-name">' + escapeHtml(formatDateTime(order.createdAt)) + '</div>';
        html += '</div>';
        html += '</button>';
    });

    panel.innerHTML = html;
    syncCustomerAccountSummary();
}

async function loadCustomerAccountOrders(options) {
    var opts = Object.assign({ silent: false, autoSelect: true }, options || {});
    var session = getCustomerAuthSession();
    if (!session) {
        clearCustomerOrdersList();
        return null;
    }

    if (!opts.silent) {
        setCustomerAuthStatus('loading', t('portalLoading'));
    }

    try {
        var response = await customerAuthFetch('/api/me/orders');
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('adminActionFailed'));
        }

        rememberCustomerAuthSession({
            token: session.token,
            expiresAt: result.session && result.session.expiresAt ? result.session.expiresAt : session.expiresAt,
            profile: result.profile || session.profile
        });
        customerAccountState.orders = Array.isArray(result.orders) ? result.orders : [];
        renderCustomerAccountOrders();

        if (customerAccountState.orders.length === 0 && customerPortalState.source === 'account') {
            customerPortalState.data = null;
            customerPortalState.source = 'portal';
            clearCustomerPortalResult();
        }

        if (opts.autoSelect && customerAccountState.orders.length > 0) {
            var selectedPublicId = customerAccountState.selectedPublicId || customerAccountState.orders[0].publicId;
            await selectCustomerAccountOrder(selectedPublicId, { silent: true });
        }

        if (!opts.silent) {
            setCustomerAuthStatus('success', t('customerAuthVerified'));
        }
        return result;
    } catch (error) {
        console.error(error);
        customerAccountState.orders = [];
        renderCustomerAccountOrders();
        setCustomerAuthStatus('error', error.message || t('adminActionFailed'));
        throw error;
    }
}

async function selectCustomerAccountOrder(publicId, options) {
    var opts = Object.assign({ silent: false }, options || {});
    customerAccountState.selectedPublicId = publicId;
    renderCustomerAccountOrders();

    try {
        var response = await customerAuthFetch('/api/me/orders/' + encodeURIComponent(publicId));
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('adminActionFailed'));
        }

        customerPortalState.data = result.data || null;
        customerPortalState.source = 'account';
        renderCustomerPortalResult();
        renderCustomerAccountOrders();
        if (!opts.silent) {
            setCustomerAuthStatus('success', t('customerAuthVerified'));
        }
        return result;
    } catch (error) {
        console.error(error);
        if (customerPortalState.source === 'account') {
            customerPortalState.data = null;
            customerPortalState.source = 'portal';
            clearCustomerPortalResult();
        }
        if (!opts.silent) {
            setCustomerAuthStatus('error', error.message || t('adminActionFailed'));
        }
        throw error;
    }
}

async function requestCustomerAuthCode(event) {
    if (event) event.preventDefault();

    var emailInput = document.getElementById('customer-auth-email');
    var button = document.getElementById('customer-auth-request-btn');
    if (!emailInput) return;

    var email = safeText(emailInput.value).trim().toLowerCase();
    if (!email) return;

    if (button) button.disabled = true;
    setCustomerAuthStatus('loading', t('portalLoading'));
    renderCustomerAuthDebugCode('');

    try {
        var response = await fetch('/api/auth/customer/request-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('adminActionFailed'));
        }

        setCustomerAuthStatus('success', t('customerAuthRequestSent'));
        renderCustomerAuthDebugCode(result.debugCode || '');
        if (result.debugCode) {
            var codeInput = document.getElementById('customer-auth-code');
            if (codeInput) codeInput.value = result.debugCode;
        }
    } catch (error) {
        console.error(error);
        setCustomerAuthStatus('error', error.message || t('adminActionFailed'));
    } finally {
        if (button) button.disabled = false;
    }
}

async function verifyCustomerAuthCode(event) {
    if (event) event.preventDefault();

    var emailInput = document.getElementById('customer-auth-email');
    var codeInput = document.getElementById('customer-auth-code');
    var button = document.getElementById('customer-auth-verify-btn');
    if (!emailInput || !codeInput) return;

    var email = safeText(emailInput.value).trim().toLowerCase();
    var code = safeText(codeInput.value).trim();
    if (!email || !code) return;

    if (button) button.disabled = true;
    setCustomerAuthStatus('loading', t('portalLoading'));

    try {
        var response = await fetch('/api/auth/customer/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                code: code
            })
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('customerAuthInvalid'));
        }

        rememberCustomerAuthSession(result);
        customerAccountState.selectedPublicId = '';
        await loadCustomerAccountOrders({ silent: true, autoSelect: true });
        setCustomerAuthStatus('success', t('customerAuthVerified'));
        showToast('success', t('myOrdersTitle'), t('customerAuthVerified'));
    } catch (error) {
        console.error(error);
        setCustomerAuthStatus('error', error.message || t('customerAuthInvalid'));
    } finally {
        if (button) button.disabled = false;
    }
}

async function customerLogout() {
    try {
        await customerAuthFetch('/api/auth/customer/logout', { method: 'POST' });
    } catch (_) {
        // session may already be expired
    }

    clearCustomerAuthSession(true);
    if (getCustomerPortalSession()) {
        loadCustomerPortalDetail({ silent: true }).catch(function () {
            clearCustomerPortalResult();
        });
    }
}

async function downloadCustomerDocument(documentId) {
    var detail = customerPortalState.data;
    if (!detail || !detail.order) {
        showToast('error', t('myOrdersTitle'), t('portalSessionExpired'));
        return;
    }

    var access = getActiveCustomerOrderAccess(detail.order.publicId);
    if (!access) {
        showToast('error', t('myOrdersTitle'), t('portalSessionExpired'));
        return;
    }

    try {
        var response = await fetch(access.documentPath + encodeURIComponent(documentId) + '/download', {
            headers: access.headers
        });
        if (response.status === 401) {
            if (access.type === 'account') {
                clearCustomerAuthSession(false);
            } else {
                clearCustomerPortalSession(false);
            }
            throw new Error(t('portalSessionExpired'));
        }
        if (!response.ok) {
            var errorBody = await response.json().catch(function () { return {}; });
            throw new Error(errorBody && errorBody.error ? errorBody.error : t('adminActionFailed'));
        }

        var blob = await response.blob();
        var fileName = extractDownloadFilename(response, 'document-' + safeInt(documentId, 0));
        var objectUrl = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () {
            URL.revokeObjectURL(objectUrl);
        }, 1000);
    } catch (error) {
        console.error(error);
        showToast('error', t('myOrdersTitle'), error.message || t('adminActionFailed'));
    }
}

async function adminFetch(url, options) {
    var token = getAdminToken();
    if (!token) {
        throw new Error(t('adminAuthRequired'));
    }

    var init = options || {};
    var headers = new Headers(init.headers || {});
    headers.set('Authorization', 'Bearer ' + token);

    var response = await fetch(url, Object.assign({}, init, { headers: headers }));
    if (response.status === 401) {
        clearAdminSession();
        navigateTo('admin');
        showToast('error', t('sessionExpiredTitle'), t('sessionExpiredMessage'));
        throw new Error(t('sessionExpiredMessage'));
    }
    return response;
}

function redirectStandaloneAuthFallback() {
    var path = window.location.pathname || '';
    var normalized = path.replace(/\/+$/, '') || '/';
    var targetPath = '';
    var authMode = '';

    if (normalized.endsWith('/login')) {
        targetPath = normalized.slice(0, -6) || '/';
        authMode = 'login';
    } else if (normalized.endsWith('/register')) {
        targetPath = normalized.slice(0, -9) || '/';
        authMode = 'register';
    }

    if (!targetPath || !authMode) return false;
    if (!targetPath.endsWith('/')) targetPath += '/';

    try {
        var params = new URLSearchParams(window.location.search || '');
        params.set('auth', authMode);
        window.location.replace(targetPath + (params.toString() ? '?' + params.toString() : '') + window.location.hash);
    } catch (_) {
        window.location.replace(targetPath + '?auth=' + authMode + window.location.hash);
    }
    return true;
}

function getRequestedAuthMode() {
    try {
        var params = new URLSearchParams(window.location.search || '');
        var authMode = params.get('auth');
        if (authMode === 'register') return 'register';
        if (authMode === 'login') return 'login';
    } catch (_) {
        return '';
    }
    return '';
}

function clearRequestedAuthMode() {
    try {
        var url = new URL(window.location.href);
        if (!url.searchParams.has('auth')) return;
        url.searchParams.delete('auth');
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    } catch (_) {
        // ignore URL parsing failures
    }
}

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    if (redirectStandaloneAuthFallback()) return;
    var requestedAuthMode = getRequestedAuthMode();

    try {
        loadState();
    } catch (e) {
        console.warn('loadState error', e);
    }

    try {
        initLanguage();
    } catch (e2) {
        console.warn('initLanguage error', e2);
    }

    try {
        initDatePicker();
    } catch (e3) {
        console.warn('initDatePicker error', e3);
    }

    try {
        initTimePicker();
    } catch (e4) {
        console.warn('initTimePicker error', e4);
    }

    try {
        initCatalogHero();
    } catch (e5) {
        console.warn('initCatalogHero error', e5);
    }

    try {
        var data = await Promise.all([
            fetch('/api/tours').then(function (r) { return r.json(); }),
            fetch('/api/hotels').then(function (r) { return r.json(); }),
            fetch('/api/config').then(function (r) { return r.json(); })
        ]);

        var tours = data[0];
        var hotels = data[1];
        var config = data[2];

        TOURS = {};
        tours.forEach(function (tour) {
            TOURS[tour.id] = tour;
        });
        HOTELS = hotels;
        CONFIG = config;

        if (CONFIG.emailjs && CONFIG.emailjs.publicKey && typeof emailjs !== 'undefined') {
            emailjs.init(CONFIG.emailjs.publicKey);
        }

        updateContactInfoUI();
        applyDemoModeState();
    } catch (e6) {
        console.error('API error', e6);
    }

    try {
        initHotelAutocomplete();
    } catch (e7) {
        console.warn('initHotelAutocomplete error', e7);
    }

    try {
        initPaymentMethodOptions();
    } catch (e8) {
        console.warn('initPaymentMethodOptions error', e8);
    }

    try {
        initAuthModal();
    } catch (e9) {
        console.warn('initAuthModal error', e9);
    }

    initRevealObserver();
    bindBookingPreviewListeners();

    var modal = document.getElementById('cart-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal && !document.body.classList.contains('checkout-view-active')) {
                closeCartModal();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (!isCartModalActive()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCartModal();
            return;
        }
        if (document.body.classList.contains('checkout-view-active')) return;
        trapCartModalFocus(e);
    });

    window.addEventListener('hashchange', handleHash);

    updateCartUI();
    setBookingStatus('idle');
    syncCustomerAuthForm();
    ensureGoogleSignInUI();
    restoreCustomerSession().catch(function (error) {
        console.warn('restoreCustomerSession error', error);
    });
    handleCheckoutReturnFromPayPal().catch(function (error) {
        console.error('handleCheckoutReturnFromPayPal error', error);
    });
    handleHash();
    if (requestedAuthMode) {
        clearRequestedAuthMode();
        openAuthModal(requestedAuthMode);
    }
}

function handleHash() {
    var hash = window.location.hash.slice(1);

    if (hash === 'checkout') {
        showCheckoutView();
        return;
    }

    if (hash === 'about') {
        showAbout();
        return;
    }

    if (hash === 'account') {
        showAccount();
        return;
    }

    if (hash === 'orders' || hash === 'admin' || hash === 'dashboard') {
        showCatalog();
        return;
    }

    if (hash && TOURS[hash]) {
        showDetail(hash);
        return;
    }

    showCatalog();
}

function navigateTo(view, tourId) {
    if (view === 'catalog') window.location.hash = '';
    else if (view === 'detail' && tourId) window.location.hash = tourId;
    else if (view === 'checkout') window.location.hash = 'checkout';
    else if (view === 'about') window.location.hash = 'about';
    else if (view === 'account') window.location.hash = 'account';
    else window.location.hash = '';
}

function setCheckoutLayoutActive(active) {
    var modal = document.getElementById('cart-modal');
    if (!modal) return;

    if (active) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('checkout-view-active');
    } else {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('checkout-view-active');
        stopCheckoutHero();
    }

    document.body.style.overflow = '';
}

function hideAllViews() {
    stopGallerySlider();

    var catalogHero = document.getElementById('catalog-hero');
    var mainView = document.getElementById('main-view');
    var detailView = document.getElementById('detail-view');
    var aboutView = document.getElementById('about-view');
    var accountView = document.getElementById('account-view');
    var ordersView = document.getElementById('orders-view');
    var adminLoginView = document.getElementById('admin-login-view');
    var adminDashboardView = document.getElementById('admin-dashboard-view');
    var testimonials = document.getElementById('testimonials');

    if (catalogHero) catalogHero.style.display = 'none';
    if (mainView) mainView.style.display = 'none';
    if (detailView) detailView.style.display = 'none';
    if (aboutView) aboutView.style.display = 'none';
    if (accountView) accountView.style.display = 'none';
    if (ordersView) ordersView.style.display = 'none';
    if (adminLoginView) adminLoginView.style.display = 'none';
    if (adminDashboardView) adminDashboardView.style.display = 'none';
    if (testimonials) testimonials.style.display = 'none';
    setCheckoutLayoutActive(false);

    var floatingBack = document.getElementById('floating-back');
    if (floatingBack) floatingBack.remove();
}

function showCatalog() {
    state.currentView = 'catalog';
    state.currentTour = null;
    hideAllViews();

    document.getElementById('catalog-hero').style.display = '';
    document.getElementById('main-view').style.display = '';
    document.getElementById('testimonials').style.display = '';

    renderCatalog();
    applyLanguage({ rerender: false, persist: false });

    window.scrollTo(0, 0);
}

function showDetail(tourId) {
    var tour = TOURS[tourId];
    if (!tour) {
        showCatalog();
        return;
    }

    state.currentView = 'detail';
    state.currentTour = tourId;
    state.adults = 0;
    state.children = 0;
    state.addOns = {};

    hideAllViews();
    document.getElementById('detail-view').style.display = '';
    renderTourDetail(tour);

    window.scrollTo(0, 0);
}

function showAbout() {
    state.currentView = 'about';
    hideAllViews();
    document.getElementById('about-view').style.display = '';
    applyLanguage({ rerender: false, persist: false });
    window.scrollTo(0, 0);
}

function showAccount() {
    state.currentView = 'account';
    state.currentTour = null;
    hideAllViews();

    var accountView = document.getElementById('account-view');
    if (accountView) accountView.style.display = '';
    if (getCustomerAuthSession()) {
        renderCustomerAccountOrders();
        renderCustomerPortalResult();
    } else {
        clearCustomerOrdersList();
        clearCustomerPortalResult();
    }
    applyLanguage({ rerender: false, persist: false });
    ensureGoogleSignInUI();
    syncCustomerAuthForm();
    window.scrollTo(0, 0);
}

function showOrdersView() {
    showAccount();
}

function showCheckoutView() {
    state.currentView = 'checkout';
    hideAllViews();
    setCheckoutLayoutActive(true);
    initCheckoutHero();
    updateCartUI();
    applyLanguage({ rerender: false, persist: false });
    focusCartModalPrimaryControl();
    window.scrollTo(0, 0);
}

function showAdminLogin() {
    showCatalog();
}

function showAdminDashboard() {
    showCatalog();
}

async function handleAdminLogin(e) {
    e.preventDefault();

    var username = document.getElementById('admin-username').value.trim();
    var password = document.getElementById('admin-password').value.trim();
    var errorEl = document.getElementById('admin-login-error');
    var submitBtn = document.querySelector('.admin-login-submit');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    }

    try {
        var response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        if (!response.ok) {
            throw new Error(t('invalidCredentials'));
        }

        var result = await response.json();
        sessionStorage.setItem('admin_token', result.token);
        sessionStorage.setItem('admin_expires_at', String(result.expiresAt || ''));

        document.getElementById('admin-login-form').reset();
        errorEl.style.display = 'none';
        navigateTo('dashboard');
    } catch (err) {
        console.error(err);
        errorEl.style.display = 'flex';
        errorEl.querySelector('span').textContent = t('invalidCredentials');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
}

async function adminLogout() {
    try {
        await adminFetch('/api/admin/logout', { method: 'POST' });
    } catch (_) {
        // Session may already be expired.
    }

    clearAdminSession();
    navigateTo('catalog');
    showToast('info', t('signedOut'), '');
}

function renderAdminOrderMetrics() {
    var rows = adminOrdersState.rows || [];
    var pendingCount = 0;
    var paidCount = 0;
    var transferCount = 0;

    rows.forEach(function (row) {
        var status = safeText(row.status).toLowerCase();
        var paymentMethod = safeText(row.payment_method).toLowerCase();
        if (status === 'paid') paidCount += 1;
        if (status !== 'paid') pendingCount += 1;
        if (paymentMethod === 'bank_transfer') transferCount += 1;
    });

    var ordersEl = document.getElementById('admin-metric-orders');
    var pendingEl = document.getElementById('admin-metric-pending');
    var paidEl = document.getElementById('admin-metric-paid');
    var transfersEl = document.getElementById('admin-metric-transfers');

    if (ordersEl) ordersEl.textContent = String(rows.length);
    if (pendingEl) pendingEl.textContent = String(pendingCount);
    if (paidEl) paidEl.textContent = String(paidCount);
    if (transfersEl) transfersEl.textContent = String(transferCount);
}

function renderAdminOrdersList() {
    var container = document.getElementById('admin-orders-list');
    if (!container) return;

    var rows = adminOrdersState.rows || [];
    if (rows.length === 0) {
        container.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('adminNoOrders')) + '</p>';
        return;
    }

    var html = '';
    rows.forEach(function (row) {
        var activeClass = row.public_id === adminOrdersState.selectedPublicId ? ' active' : '';
        html += '<button type="button" class="admin-order-row' + activeClass + '" onclick="selectAdminOrder(\'' + escapeAttr(row.public_id) + '\')">';
        html += '<div class="admin-order-row-top">';
        html += '<div><div class="admin-order-row-id">' + escapeHtml(row.public_id) + '</div><div class="admin-order-row-name">' + escapeHtml(row.guest_name || row.guest_email_masked || '') + '</div></div>';
        html += '<div class="admin-order-row-total">' + escapeHtml(formatCurrency(row.total, row.currency)) + '</div>';
        html += '</div>';
        html += '<div class="admin-order-row-bottom">';
        html += '<div class="admin-order-row-meta">';
        html += '<span class="admin-order-chip ' + escapeAttr(toStatusClass(row.status)) + '">' + escapeHtml(normalizeStatusLabel(row.status)) + '</span>';
        html += '<span class="admin-order-chip">' + escapeHtml(normalizeStatusLabel(row.payment_status || row.payment_method)) + '</span>';
        html += '<span class="admin-order-chip">' + escapeHtml(normalizePaymentMethodLabel(row.payment_method, row.fee_percent)) + '</span>';
        html += '</div>';
        html += '<div class="admin-order-row-name">' + escapeHtml(formatDateTime(row.created_at)) + '</div>';
        html += '</div>';
        html += '</button>';
    });

    container.innerHTML = html;
}

function buildAdminDetailList(items) {
    return items.map(function (item) {
        return '<div class="admin-detail-item"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></div>';
    }).join('');
}

function renderAdminOrderDetail() {
    var container = document.getElementById('admin-order-detail');
    if (!container) return;

    var detail = adminOrdersState.detail;
    if (!detail || !detail.order) {
        container.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('adminOrderDetailEmpty')) + '</p>';
        return;
    }

    var order = detail.order;
    var payment = detail.payment || null;
    var items = Array.isArray(detail.items) ? detail.items : [];
    var documents = Array.isArray(detail.documents) ? detail.documents : [];
    var transferSubmissions = Array.isArray(detail.transferSubmissions) ? detail.transferSubmissions : [];

    var actionsHtml = '';
    if (payment && payment.provider === 'paypal' && payment.intent === 'AUTHORIZE' && payment.paypal_authorization_id && payment.status !== 'paid') {
        actionsHtml += '<button type="button" class="btn btn-primary" onclick="captureAdminPayment(' + safeInt(payment.id, 0) + ')">' + escapeHtml(t('adminCapturePayment')) + '</button>';
    }
    if (payment && payment.provider === 'bank_transfer' && payment.status !== 'paid') {
        actionsHtml += '<button type="button" class="btn btn-primary" onclick="confirmAdminTransfer(' + safeInt(payment.id, 0) + ')">' + escapeHtml(t('adminConfirmTransfer')) + '</button>';
    }

    var itemHtml = items.length === 0 ? '<p class="admin-orders-empty">' + escapeHtml(t('cartEmpty')) + '</p>' : items.map(function (item) {
        var addOns = Array.isArray(item.add_ons) ? item.add_ons : [];
        var description = safeInt(item.adults, 0) + ' ' + t('adultUnit') + ', ' + safeInt(item.children, 0) + ' ' + t('childUnit');
        if (addOns.length > 0) {
            description += ' + ' + addOns.map(function (addOn) {
                return safeText(addOn.id || addOn.slug || 'add-on');
            }).join(', ');
        }

        return '<div class="admin-order-item"><strong>' + escapeHtml(item.tour_title_en || item.tour_slug) + '</strong><p>' + escapeHtml(description) + '</p><p>' + escapeHtml(formatCurrency(item.subtotal, order.currency)) + '</p></div>';
    }).join('');

    var documentsHtml = documents.length === 0 ? '<p class="admin-orders-empty">' + escapeHtml(t('adminNoDocuments')) + '</p>' : documents.map(function (document) {
        var downloadHref = '/api/admin/orders/' + encodeURIComponent(order.public_id) + '/documents/' + encodeURIComponent(document.id) + '/download';
        return '<div class="admin-order-document"><strong>' + escapeHtml(document.document_type) + '</strong><p>' + escapeHtml(formatDateTime(document.created_at)) + '</p><p><a href="' + escapeAttr(downloadHref) + '" target="_blank" rel="noopener">' + escapeHtml(t('adminDownloadDocument')) + '</a></p></div>';
    }).join('');

    var transfersHtml = transferSubmissions.length === 0 ? '<p class="admin-orders-empty">' + escapeHtml(t('adminNoTransfers')) + '</p>' : transferSubmissions.map(function (submission) {
        return '<div class="admin-order-document"><strong>' + escapeHtml((submission.review_status || 'pending').replace(/_/g, ' ')) + '</strong><p>' + escapeHtml(t('adminMatchScore') + ': ' + safeInt(submission.match_score, 0)) + '</p><p>' + escapeHtml(t('reference') + ': ' + (submission.submitted_reference || t('notSpecified'))) + '</p><p>' + escapeHtml(t('adminReviewedBy') + ': ' + (submission.reviewed_by || t('notSpecified'))) + '</p></div>';
    }).join('');

    container.innerHTML = ''
        + '<div class="admin-detail-header">'
        + '<div><h5>' + escapeHtml(order.public_id) + '</h5><p class="admin-detail-subtitle">' + escapeHtml(formatDateTime(order.created_at)) + '</p></div>'
        + '<div class="admin-order-row-meta"><span class="admin-order-chip ' + escapeAttr(toStatusClass(order.status)) + '">' + escapeHtml(normalizeStatusLabel(order.status)) + '</span></div>'
        + '</div>'
        + (actionsHtml ? '<div class="admin-detail-actions">' + actionsHtml + '</div>' : '')
        + '<div class="admin-detail-grid">'
        + '<div class="admin-detail-card"><h6>' + escapeHtml(t('adminCustomer')) + '</h6><div class="admin-detail-list">' + buildAdminDetailList([
            { label: t('name'), value: order.guest_name || t('notSpecified') },
            { label: t('adminGuestEmail'), value: order.guest_email || t('notSpecified') },
            { label: t('adminGuestPhone'), value: order.guest_phone || t('notSpecified') },
            { label: t('hotel'), value: order.hotel || t('notSpecified') },
            { label: t('comments'), value: order.comments || t('noComments') }
        ]) + '</div></div>'
        + '<div class="admin-detail-card"><h6>' + escapeHtml(t('adminPayment')) + '</h6><div class="admin-detail-list">' + buildAdminDetailList([
            { label: t('adminMethod'), value: normalizePaymentMethodLabel(order.payment_method, order.fee_percent) },
            { label: t('adminOrderStatus'), value: normalizeStatusLabel(order.status) },
            { label: t('adminProviderStatus'), value: order.provider_status || t('notSpecified') },
            { label: t('adminServiceDate'), value: order.service_date || t('notSpecified') },
            { label: t('pickupTime'), value: order.pickup_time || t('notSpecified') }
        ].concat(buildPricingDetailItems({
            subtotal: order.subtotal,
            feePercent: order.fee_percent,
            feeAmount: order.fee_amount,
            totalFinal: order.total_final || order.total,
            currency: order.currency
        })).concat(detail.bankTransfer ? [
            { label: t('bankName'), value: detail.bankTransfer.bankName || t('notSpecified') },
            { label: t('beneficiary'), value: detail.bankTransfer.beneficiary || t('notSpecified') },
            { label: t('clabe'), value: detail.bankTransfer.clabe || t('notSpecified') },
            { label: t('account'), value: detail.bankTransfer.account || t('notSpecified') },
            { label: t('depositCard'), value: detail.bankTransfer.cardNumber || t('notSpecified') }
        ] : []).concat(payment ? [
            { label: t('adminAmount'), value: formatCurrency(payment.total_final || payment.amount, order.currency) },
            { label: t('adminPaymentId'), value: String(payment.id) },
            { label: t('adminPaymentStatus'), value: normalizeStatusLabel(payment.status) },
            { label: t('adminIntent'), value: payment.intent || t('notSpecified') }
        ] : [])) + '</div></div>'
        + '</div>'
        + '<div class="admin-detail-card"><h6>' + escapeHtml(t('adminOrderItems')) + '</h6><div class="admin-order-items">' + itemHtml + '</div></div>'
        + '<div class="admin-detail-grid">'
        + '<div class="admin-detail-card"><h6>' + escapeHtml(t('adminDocuments')) + '</h6><div class="admin-order-documents">' + documentsHtml + '</div></div>'
        + '<div class="admin-detail-card"><h6>' + escapeHtml(t('adminTransferSubmissions')) + '</h6><div class="admin-order-documents">' + transfersHtml + '</div></div>'
        + '</div>';
}

async function loadAdminOrders(showSuccessToast) {
    var list = document.getElementById('admin-orders-list');
    var detail = document.getElementById('admin-order-detail');
    if (list) list.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('adminLoadingOrders')) + '</p>';
    if (detail && !adminOrdersState.selectedPublicId) {
        detail.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('adminLoadingOrders')) + '</p>';
    }

    var response = await adminFetch('/api/admin/orders');
    var rows = await response.json();

    adminOrdersState.rows = Array.isArray(rows) ? rows : [];
    renderAdminOrderMetrics();

    if (adminOrdersState.rows.length === 0) {
        adminOrdersState.selectedPublicId = '';
        adminOrdersState.detail = null;
        renderAdminOrdersList();
        renderAdminOrderDetail();
    } else {
        var selectedExists = adminOrdersState.rows.some(function (row) {
            return row.public_id === adminOrdersState.selectedPublicId;
        });
        if (!selectedExists) {
            adminOrdersState.selectedPublicId = adminOrdersState.rows[0].public_id;
        }
        renderAdminOrdersList();
        await selectAdminOrder(adminOrdersState.selectedPublicId, { silent: true });
    }

    if (showSuccessToast) {
        showToast('success', t('adminOrdersTitle'), t('adminRefreshSuccess'));
    }
}

async function selectAdminOrder(publicId, options) {
    var opts = Object.assign({ silent: false }, options || {});
    adminOrdersState.selectedPublicId = publicId;
    renderAdminOrdersList();

    var container = document.getElementById('admin-order-detail');
    if (container && !opts.silent) {
        container.innerHTML = '<p class="admin-orders-empty">' + escapeHtml(t('adminLoadingOrders')) + '</p>';
    }

    try {
        var response = await adminFetch('/api/admin/orders/' + encodeURIComponent(publicId));
        adminOrdersState.detail = await response.json();
        renderAdminOrderDetail();
    } catch (error) {
        console.error(error);
        adminOrdersState.detail = null;
        renderAdminOrderDetail();
        showToast('error', t('adminOrdersTitle'), error.message || t('adminActionFailed'));
    }
}

async function captureAdminPayment(paymentId) {
    try {
        var response = await adminFetch('/api/admin/payments/' + encodeURIComponent(paymentId) + '/capture', {
            method: 'POST'
        });
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('adminActionFailed'));
        }
        showToast('success', t('adminPaymentsTitle'), t('adminCaptureSuccess'));
        await loadAdminOrders(false);
    } catch (error) {
        console.error(error);
        showToast('error', t('adminPaymentsTitle'), error.message || t('adminActionFailed'));
    }
}

async function confirmAdminTransfer(paymentId) {
    try {
        var response = await adminFetch('/api/admin/payments/' + encodeURIComponent(paymentId) + '/confirm-transfer', {
            method: 'POST'
        });
        var result = await response.json();
        if (!response.ok || (result && result.error)) {
            throw new Error(result && result.error ? result.error : t('adminActionFailed'));
        }
        showToast('success', t('adminPaymentsTitle'), t('adminTransferConfirmed'));
        await loadAdminOrders(false);
    } catch (error) {
        console.error(error);
        showToast('error', t('adminPaymentsTitle'), error.message || t('adminActionFailed'));
    }
}

function initLanguage() {
    var selector = document.getElementById('language-selector');
    if (!selector) return;

    selector.value = normalizeLanguage(state.language);
    selector.addEventListener('change', function (e) {
        changeLanguage(e.target.value, { rerender: true, persist: true });
    });

    document.addEventListener('click', function (e) {
        var wrapper = document.getElementById('language-selector-container');
        if (wrapper && !wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });

    applyLanguage({ rerender: false, persist: false });
}

function toggleLanguageDropdown() {
    var selector = document.getElementById('language-selector-container');
    if (!selector) return;
    selector.classList.toggle('open');
}

function applyLanguage(options) {
    changeLanguage(state.language, options || { rerender: false, persist: false });
}

function changeLanguage(lang, options) {
    var opts = Object.assign({ rerender: true, persist: true }, options || {});
    state.language = normalizeLanguage(lang);

    if (opts.persist) saveState();

    var selector = document.getElementById('language-selector');
    if (selector) selector.value = state.language;

    var flag = document.getElementById('lang-flag');
    var text = document.getElementById('lang-text');
    if (flag) flag.src = 'imagenes/flags/' + (state.language === 'es' ? 'es' : 'us') + '.jpg';
    if (text) text.textContent = state.language === 'es' ? 'Español' : 'English';

    document.querySelectorAll('.selector-option').forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.lang === state.language);
    });

    var wrapper = document.getElementById('language-selector-container');
    if (wrapper) wrapper.classList.remove('open');

    document.documentElement.lang = state.language;
    if (window.tourDatePicker) {
        window.tourDatePicker.set('locale', state.language === 'es' ? 'es' : 'default');
        window.tourDatePicker.set('dateFormat', getDateFormatByLanguage());
    }

    if (opts.rerender) {
        if (state.currentView === 'catalog') {
            renderCatalog();
        } else if (state.currentTour && TOURS[state.currentTour]) {
            renderTourDetail(TOURS[state.currentTour]);
        } else if (state.currentView === 'orders' || state.currentView === 'account') {
            renderCustomerAccountOrders();
            renderCustomerPortalResult();
        } else if (state.currentView === 'dashboard') {
            renderAdminOrderMetrics();
            renderAdminOrdersList();
            renderAdminOrderDetail();
        }
    }

    applyDataTranslations();
    if (isCartModalActive()) updateCartUI();
    if (state.latestCheckoutOrder && state.latestCheckoutOrder.order) {
        renderCheckoutResult(state.latestCheckoutOrder, state.latestCheckoutOrder.order.paymentMethod);
    }
}

function applyDataTranslations() {
    document.querySelectorAll('[data-es]').forEach(function (el) {
        var value = el.getAttribute('data-' + state.language);
        if (value != null) el.textContent = value;
    });

    document.querySelectorAll('[data-placeholder-es]').forEach(function (el) {
        var placeholder = el.getAttribute('data-placeholder-' + state.language);
        if (placeholder != null) el.setAttribute('placeholder', placeholder);
    });

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });

    var mapBtn = document.querySelector('.hotel-map-btn');
    if (mapBtn) {
        mapBtn.title = t('mapsTitle');
        var span = mapBtn.querySelector('span');
        if (span) span.textContent = t('maps');
    }

    var closeCartBtn = document.querySelector('.close-modal');
    if (closeCartBtn) {
        closeCartBtn.setAttribute('aria-label', t('closeCart'));
    }

    renderPaymentMethodCopy();
    renderCheckoutPricingSummary();
    syncCustomerAuthForm();
    if (isAuthModalOpen()) syncAuthModeUI();
}

function getSelectedPaymentMethod() {
    ensureSelectedPaymentMethod();

    var selected = document.querySelector('input[name="payment_method"]:checked');
    if (selected) {
        state.selectedPaymentMethod = selected.value;
    }
    return state.selectedPaymentMethod;
}

function setSelectedPaymentMethod(method) {
    if (getConfiguredPaymentMethods().indexOf(method) === -1) return;

    if (state.selectedPaymentMethod !== method && state.latestCheckoutOrder) {
        clearCheckoutResult();
    }

    state.selectedPaymentMethod = method;

    var input = document.querySelector('input[name="payment_method"][value="' + method + '"]');
    if (input) input.checked = true;

    updatePaymentMethodUI();
}

function updatePaymentMethodUI() {
    var selected = ensureSelectedPaymentMethod();
    var available = getConfiguredPaymentMethods();

    document.querySelectorAll('.payment-method-option').forEach(function (option) {
        var method = option.getAttribute('data-payment-method');
        var input = option.querySelector('input');
        var enabled = available.indexOf(method) !== -1;
        option.classList.toggle('disabled', !enabled);
        option.classList.toggle('active', enabled && method === selected);
        option.setAttribute('aria-disabled', enabled ? 'false' : 'true');
        option.setAttribute('aria-checked', enabled && method === selected ? 'true' : 'false');
        if (input) {
            input.disabled = !enabled;
            input.checked = enabled && method === selected;
        }
    });

    hideBookingPreviews();
    renderCheckoutPricingSummary();
    syncCheckoutActionButtons();
}

function isCheckoutPreviewModeActive() {
    return state.checkoutPreviewMode;
}

function formatPreviewDateValue(date) {
    var value = date instanceof Date ? date : new Date(date);
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';

    var month = String(value.getMonth() + 1).padStart(2, '0');
    var day = String(value.getDate()).padStart(2, '0');
    var year = String(value.getFullYear());
    return state.language === 'en'
        ? month + '/' + day + '/' + year
        : day + '/' + month + '/' + year;
}

function captureCheckoutFormSnapshot() {
    var hotelInput = document.getElementById('customer-hotel');
    var pickerDate = '';
    if (window.tourDatePicker && window.tourDatePicker.selectedDates && window.tourDatePicker.selectedDates[0]) {
        pickerDate = window.tourDatePicker.selectedDates[0].toISOString();
    }

    return {
        customerName: safeText(document.getElementById('customer-name') && document.getElementById('customer-name').value),
        customerEmail: safeText(document.getElementById('customer-email') && document.getElementById('customer-email').value),
        customerPhone: safeText(document.getElementById('customer-phone') && document.getElementById('customer-phone').value),
        tourDateIso: pickerDate,
        tourDateText: safeText(document.getElementById('tour-date') && document.getElementById('tour-date').value),
        pickupHour: safeText(document.getElementById('pickup-hour') && document.getElementById('pickup-hour').value),
        pickupMin: safeText(document.getElementById('pickup-min') && document.getElementById('pickup-min').value),
        pickupTime: safeText(document.getElementById('pickup-time') && document.getElementById('pickup-time').value),
        hotel: safeText(hotelInput && hotelInput.value),
        hotelDataset: {
            hotel: safeText(hotelInput && hotelInput.dataset ? hotelInput.dataset.hotel : ''),
            zone: safeText(hotelInput && hotelInput.dataset ? hotelInput.dataset.zone : '')
        },
        comments: safeText(document.getElementById('customer-comments') && document.getElementById('customer-comments').value),
        selectedPaymentMethod: safeText(state.selectedPaymentMethod)
    };
}

function restoreCheckoutFormSnapshot(snapshot) {
    var data = snapshot || {};
    var nameInput = document.getElementById('customer-name');
    var emailInput = document.getElementById('customer-email');
    var phoneInput = document.getElementById('customer-phone');
    var dateInput = document.getElementById('tour-date');
    var hotelInput = document.getElementById('customer-hotel');
    var commentsInput = document.getElementById('customer-comments');
    var pickupHour = document.getElementById('pickup-hour');
    var pickupMin = document.getElementById('pickup-min');
    var pickupTime = document.getElementById('pickup-time');

    if (nameInput) nameInput.value = data.customerName || '';
    if (emailInput) emailInput.value = data.customerEmail || '';
    if (phoneInput) phoneInput.value = data.customerPhone || '';

    if (window.tourDatePicker) {
        if (data.tourDateIso) {
            window.tourDatePicker.setDate(new Date(data.tourDateIso), true);
        } else {
            window.tourDatePicker.clear();
        }
    } else if (dateInput) {
        dateInput.value = data.tourDateText || '';
    }

    if (pickupHour) pickupHour.value = data.pickupHour || '';
    if (pickupMin) pickupMin.value = data.pickupMin || '';
    if (pickupHour) pickupHour.dispatchEvent(new Event('change', { bubbles: true }));
    if (pickupMin) pickupMin.dispatchEvent(new Event('change', { bubbles: true }));
    if (pickupTime && !data.pickupHour && !data.pickupMin) {
        pickupTime.value = data.pickupTime || '';
    }

    if (hotelInput) {
        hotelInput.value = data.hotel || '';
        delete hotelInput.dataset.hotel;
        delete hotelInput.dataset.zone;
        if (data.hotelDataset && data.hotelDataset.hotel) {
            hotelInput.dataset.hotel = data.hotelDataset.hotel;
        }
        if (data.hotelDataset && data.hotelDataset.zone) {
            hotelInput.dataset.zone = data.hotelDataset.zone;
        }
    }

    if (commentsInput) commentsInput.value = data.comments || '';

    state.selectedPaymentMethod = data.selectedPaymentMethod || getDefaultPaymentMethod();

    closeAC();
    setHotelNoMatchHint(false);
    if (data.hotelDataset && data.hotelDataset.hotel) {
        showMapBtn(data.hotelDataset.hotel);
    } else {
        hideMapBtn();
    }

    updatePaymentMethodUI();
    updatePreviews();
}

function buildPreviewCartItem() {
    var tours = Object.values(TOURS).filter(function (tour) {
        return tour
            && tour.id
            && tour.pricing
            && Array.isArray(tour.pricing.tiers)
            && tour.pricing.tiers.length > 0;
    });
    var tour = pickRandomItem(tours);
    if (!tour) {
        return {
            id: 'preview-generic-' + Date.now(),
            previewDemo: true,
            name: state.language === 'en' ? 'Riviera Maya Demo Experience' : 'Experiencia demo Riviera Maya',
            image: 'imagenes/whale.jpg',
            adults: 4,
            children: 1,
            adultPriceUSD: 145,
            childPriceUSD: 85,
            addOns: [],
            subtotalUSD: 665
        };
    }

    var tiers = (tour.pricing.tiers || []).filter(function (tier) {
        return safeInt(tier && tier.adults, 0) > 0 && safeInt(tier && tier.adultPrice, 0) > 0;
    });
    var selectedTier = pickRandomItem(tiers) || { adults: 2, adultPrice: safeInt(tour.card && tour.card.priceFrom, 0) };
    var adults = Math.max(1, safeInt(selectedTier.adults, 2));
    var children = randomIntBetween(0, Math.min(2, adults > 2 ? 2 : 1));
    var childPrice = safeInt(tour.pricing.childPriceFlat, 0);
    var totalTravelers = adults + children;
    var selectedAddOns = [];
    var addOnOptions = tour.addOns && Array.isArray(tour.addOns.options) ? tour.addOns.options : [];

    if (addOnOptions.length > 0 && Math.random() >= 0.5) {
        var selectedAddOn = pickRandomItem(addOnOptions);
        if (selectedAddOn) {
            selectedAddOns.push({
                id: selectedAddOn.id,
                name: getLocalized(selectedAddOn.title, state.language),
                pricePerPerson: safeInt(selectedAddOn.pricePerPerson, 0)
            });
        }
    }

    var addOnsSubtotal = selectedAddOns.reduce(function (sum, addOn) {
        return sum + safeInt(addOn.pricePerPerson, 0) * totalTravelers;
    }, 0);
    var firstImage = tour.gallery && Array.isArray(tour.gallery.images) && tour.gallery.images.length > 0
        ? tour.gallery.images[0]
        : 1;

    return {
        id: 'preview-' + tour.id + '-' + Date.now(),
        previewDemo: true,
        tourId: tour.id,
        name: getLocalized(tour.hero.title, state.language),
        image: sanitizeImageUrl(buildImageUrl(tour.imageFolder, firstImage)),
        adults: adults,
        children: children,
        adultPriceUSD: safeInt(selectedTier.adultPrice, safeInt(tour.card && tour.card.priceFrom, 0)),
        childPriceUSD: childPrice,
        addOns: selectedAddOns,
        subtotalUSD: adults * safeInt(selectedTier.adultPrice, 0) + children * childPrice + addOnsSubtotal
    };
}

function applyCheckoutPreviewDummyData(previewItem) {
    var nameInput = document.getElementById('customer-name');
    var emailInput = document.getElementById('customer-email');
    var phoneInput = document.getElementById('customer-phone');
    var dateInput = document.getElementById('tour-date');
    var hotelInput = document.getElementById('customer-hotel');
    var commentsInput = document.getElementById('customer-comments');
    var pickupHour = document.getElementById('pickup-hour');
    var pickupMin = document.getElementById('pickup-min');
    var previewDate = new Date();
    var pickupHourValue = String(randomIntBetween(8, 11));
    var pickupMinuteValue = pickRandomItem(['00', '30']) || '00';
    var previewTitle = previewItem ? getCartItemName(previewItem) : t('previewCheckoutCartValue');
    var demoCode = Date.now().toString(36).slice(-5);

    previewDate.setDate(previewDate.getDate() + 1);

    if (nameInput) nameInput.value = state.language === 'en' ? 'Demo Guest' : 'Cliente demo';
    if (emailInput) emailInput.value = 'demo+' + demoCode + '@lindotours.test';
    if (phoneInput) phoneInput.value = '+52 998 101 2020';
    if (window.tourDatePicker) {
        window.tourDatePicker.setDate(previewDate, true);
    } else if (dateInput) {
        dateInput.value = formatPreviewDateValue(previewDate);
    }
    if (pickupHour) pickupHour.value = pickupHourValue;
    if (pickupMin) pickupMin.value = pickupMinuteValue;
    if (pickupHour) pickupHour.dispatchEvent(new Event('change', { bubbles: true }));
    if (pickupMin) pickupMin.dispatchEvent(new Event('change', { bubbles: true }));
    if (hotelInput) {
        hotelInput.value = state.language === 'en' ? 'Demo Hotel Cancun' : 'Hotel demo Cancun';
        delete hotelInput.dataset.hotel;
        delete hotelInput.dataset.zone;
    }
    if (commentsInput) {
        commentsInput.value = state.language === 'en'
            ? 'Demo checkout for ' + previewTitle + '. Review the fee display and final payment states.'
            : 'Checkout demo para ' + previewTitle + '. Revisa la comision y los estados del pago final.';
    }

    hideMapBtn();
    closeAC();
    setHotelNoMatchHint(false);
    updatePreviews();
}

function activateCheckoutPreviewMode() {
    if (!state.checkoutPreviewBackup) {
        state.checkoutPreviewBackup = captureCheckoutFormSnapshot();
    }
    clearCheckoutResult();
    state.checkoutPreviewMode = true;
    state.cart = [];

    var previewItem = buildPreviewCartItem();
    if (previewItem) {
        state.cart = [previewItem];
    }

    state.selectedPaymentMethod = getConfiguredPaymentMethods().indexOf('bank_transfer') !== -1 ? 'bank_transfer' : getDefaultPaymentMethod();
    applyCheckoutPreviewDummyData(previewItem);
    updatePaymentMethodUI();
}

function resetCheckoutPreviewMode(options) {
    var opts = Object.assign({ restoreForm: true }, options || {});
    var snapshot = state.checkoutPreviewBackup;
    var wasPreviewMode = state.checkoutPreviewMode;

    state.checkoutPreviewMode = false;
    state.checkoutPreviewBackup = null;
    if (wasPreviewMode) {
        state.cart = state.cart.filter(function (item) {
            return !item || !item.previewDemo;
        });
        clearCheckoutResult();
    }

    if (opts.restoreForm && snapshot) {
        restoreCheckoutFormSnapshot(snapshot);
    } else if (snapshot && snapshot.selectedPaymentMethod) {
        state.selectedPaymentMethod = snapshot.selectedPaymentMethod;
        updatePaymentMethodUI();
    }
}

function syncCheckoutActionButtons() {
    var hasItems = state.cart.length > 0;
    var previewMode = isCheckoutPreviewModeActive();
    var canAdvance = hasItems || previewMode;
    var nextStep = state.checkoutStep;
    var selected = getSelectedPaymentMethod();
    var available = getConfiguredPaymentMethods();
    var hasActiveResult = Boolean(
        state.latestCheckoutOrder
        && state.latestCheckoutOrder.order
        && state.latestCheckoutOrder.order.paymentMethod === selected
    );

    var checkoutBtn = document.getElementById('checkout-btn');
    var previewCheckoutBtn = document.getElementById('preview-checkout-btn');
    var confirmBtn = document.getElementById('confirm-btn');
    var backToCartBtn = document.getElementById('back-to-cart-btn');
    var editDetailsBtn = document.getElementById('edit-details-btn');
    var payPayPalBtn = document.getElementById('pay-paypal-btn');
    var bankTransferBtn = document.getElementById('bank-transfer-btn');
    var payPayPalCardBtn = document.getElementById('payment-option-paypal-cta');
    var bankTransferCardBtn = document.getElementById('payment-option-bank-transfer-cta');
    var confirmMobileActionBar = document.getElementById('confirm-mobile-action-bar');
    var confirmMobilePayBtn = document.getElementById('confirm-mobile-pay-btn');
    var confirmMobilePayLabel = document.getElementById('confirm-mobile-pay-label');
    var showMobileActionBar = canAdvance
        && nextStep === 3
        && !hasActiveResult
        && (selected === 'paypal' || selected === 'bank_transfer');

    if (checkoutBtn) checkoutBtn.style.display = hasItems && nextStep === 1 ? 'flex' : 'none';
    if (previewCheckoutBtn) previewCheckoutBtn.style.display = !hasItems ? 'flex' : 'none';
    if (confirmBtn) confirmBtn.style.display = canAdvance && nextStep === 2 ? 'flex' : 'none';
    if (backToCartBtn) backToCartBtn.style.display = canAdvance && nextStep >= 2 ? 'flex' : 'none';
    if (editDetailsBtn) editDetailsBtn.style.display = canAdvance && nextStep === 3 ? 'flex' : 'none';

    if (payPayPalBtn) payPayPalBtn.style.display = 'none';
    if (bankTransferBtn) bankTransferBtn.style.display = 'none';
    if (payPayPalCardBtn) {
        payPayPalCardBtn.disabled = nextStep !== 3 || available.indexOf('paypal') === -1 || (hasActiveResult && selected === 'paypal');
    }
    if (bankTransferCardBtn) {
        bankTransferCardBtn.disabled = nextStep !== 3 || available.indexOf('bank_transfer') === -1 || (hasActiveResult && selected === 'bank_transfer');
    }
    if (confirmMobileActionBar) confirmMobileActionBar.hidden = !showMobileActionBar;
    if (confirmMobilePayBtn) confirmMobilePayBtn.disabled = !showMobileActionBar;
    if (confirmMobilePayLabel) confirmMobilePayLabel.textContent = getPrimaryCheckoutActionLabel(selected);
}

function initPaymentMethodOptions() {
    document.querySelectorAll('input[name="payment_method"]').forEach(function (input) {
        if (input.dataset.bound === '1') return;
        input.dataset.bound = '1';
        input.addEventListener('change', function () {
            setSelectedPaymentMethod(input.value);
        });
    });

    document.querySelectorAll('.payment-method-option').forEach(function (option) {
        if (option.dataset.bound === '1') return;
        option.dataset.bound = '1';

        option.addEventListener('click', function (event) {
            if (event.target.closest('button') || event.target.closest('a') || event.target.closest('input')) return;
            setSelectedPaymentMethod(option.getAttribute('data-payment-method'));
        });

        option.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('button') || event.target.closest('a')) return;
            event.preventDefault();
            setSelectedPaymentMethod(option.getAttribute('data-payment-method'));
        });
    });

    state.selectedPaymentMethod = getConfiguredPaymentMethods().indexOf('bank_transfer') !== -1 ? 'bank_transfer' : getDefaultPaymentMethod();
    updatePaymentMethodUI();
}

async function createCheckoutOrder(paymentMethod) {
    var payload = buildBookingPayload();
    payload.paymentMethod = paymentMethod;
    payload.currency = CONFIG.payments && CONFIG.payments.currency ? CONFIG.payments.currency : 'USD';
    var customerSession = getCustomerAuthSession();
    var headers = { 'Content-Type': 'application/json' };
    if (customerSession && customerSession.token) {
        headers.Authorization = 'Bearer ' + customerSession.token;
    }

    var response = await fetch('/api/orders', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        var message = t('bookingFailed');
        try {
            var body = await response.json();
            if (body && body.error) message = body.error;
        } catch (_) {
            // ignore json parse errors
        }
        throw new Error(message);
    }

    var result = await response.json();
    if (result && result.order) {
        result.lookupEmail = safeText(payload.email).trim().toLowerCase();
        state.latestCheckoutOrder = result;
    }
    if (result && result.order && result.portal) {
        rememberCustomerPortalSession(result.order.publicId, result.portal, payload.email);
    }
    if (customerSession && customerSession.token) {
        loadCustomerAccountOrders({ silent: true, autoSelect: false }).catch(function () {
            // keep checkout flow resilient if account refresh fails
        });
    }

    return result;
}

async function createPayPalRedirectOrder(orderPublicId) {
    var returnUrl = buildCurrentPageUrl({
        paypal_return: '1',
        order_public_id: orderPublicId
    });
    var cancelUrl = buildCurrentPageUrl({
        paypal_cancel: '1',
        order_public_id: orderPublicId
    });

    var response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderPublicId: orderPublicId,
            returnUrl: returnUrl,
            cancelUrl: cancelUrl
        })
    });

    if (!response.ok) {
        var message = t('paypalPaymentError');
        try {
            var body = await response.json();
            if (body && body.error) message = body.error;
        } catch (_) {
            // ignore
        }
        throw new Error(message);
    }

    return response.json();
}

async function finalizePayPalOrder(orderPublicId, paypalOrderId) {
    var response = await fetch('/api/payments/paypal/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderPublicId: orderPublicId,
            paypalOrderId: paypalOrderId
        })
    });

    if (!response.ok) {
        var message = t('paypalPaymentError');
        try {
            var body = await response.json();
            if (body && body.error) message = body.error;
        } catch (_) {
            // ignore
        }
        throw new Error(message);
    }

    return response.json();
}

async function cancelPayPalOrder(orderPublicId, paypalOrderId) {
    var response = await fetch('/api/payments/paypal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderPublicId: orderPublicId,
            paypalOrderId: paypalOrderId
        })
    });

    if (!response.ok) {
        try {
            var body = await response.json();
            if (body && body.error) throw new Error(body.error);
        } catch (error) {
            if (error instanceof Error) throw error;
        }
        throw new Error(t('paypalPaymentError'));
    }

    return response.json();
}

function renderCheckoutResult(orderResult, mode) {
    state.latestCheckoutOrder = orderResult;
    renderCheckoutPaymentCards();

    var card = document.getElementById('checkout-result-card');
    var orderId = document.getElementById('checkout-result-order-id');
    var message = document.getElementById('checkout-result-message');
    var grid = document.getElementById('checkout-result-grid');
    var proofBox = document.getElementById('transfer-proof-box');

    if (!card || !orderId || !message || !grid) return;

    card.hidden = false;
    orderId.textContent = orderResult && orderResult.order ? orderResult.order.publicId : 'LT-XXXX';
    grid.className = 'checkout-result-layout';
    grid.replaceChildren();
    if (proofBox) proofBox.hidden = true;

    var order = orderResult && orderResult.order ? orderResult.order : null;
    var finalTotal = order ? (order.totalFinal != null ? order.totalFinal : order.total) : null;
    var normalizedMode = safeText(mode || (order && order.paymentMethod)).toLowerCase();
    var isBankTransfer = normalizedMode === 'bank_transfer' && orderResult && orderResult.bankTransfer;

    if (isBankTransfer) {
        message.textContent = orderResult.demo
            ? t('previewTransferSimulated')
            : t('transferInstructionsReady') + ' ' + t('transferExactMatchNote');

        var transferDetailsSection = createCheckoutResultSection(t('transferDetailsTitle'));
        if (order) {
            appendCheckoutResultHighlight(
                transferDetailsSection.section,
                t('transferAmountToSend'),
                formatCurrency(finalTotal, order.currency)
            );
        }
        appendCheckoutResultItem(transferDetailsSection.grid, t('reference'), safeText(orderResult.bankTransfer.reference || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.reference || ''
        });
        appendCheckoutResultItem(transferDetailsSection.grid, t('expiresAt'), formatDateTime(orderResult.bankTransfer.expiresAt));
        grid.appendChild(transferDetailsSection.section);

        var destinationSection = createCheckoutResultSection(t('transferDestinationTitle'));
        appendCheckoutResultItem(destinationSection.grid, t('bankName'), safeText(orderResult.bankTransfer.bankName || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.bankName || ''
        });
        appendCheckoutResultItem(destinationSection.grid, t('beneficiary'), safeText(orderResult.bankTransfer.beneficiary || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.beneficiary || ''
        });
        appendCheckoutResultItem(destinationSection.grid, t('clabe'), safeText(orderResult.bankTransfer.clabe || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.clabe || ''
        });
        appendCheckoutResultItem(destinationSection.grid, t('account'), safeText(orderResult.bankTransfer.account || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.account || ''
        });
        appendCheckoutResultItem(destinationSection.grid, t('depositCard'), safeText(orderResult.bankTransfer.cardNumber || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.cardNumber || ''
        });
        appendCheckoutResultItem(destinationSection.grid, t('swift'), safeText(orderResult.bankTransfer.swift || t('notSpecified')), {
            copyValue: orderResult.bankTransfer.swift || ''
        });
        grid.appendChild(destinationSection.section);

        if (proofBox) proofBox.hidden = Boolean(orderResult.demo);
        return;
    }

    if (normalizedMode === 'paypal') {
        var providerStatus = safeText(orderResult && orderResult.payment && orderResult.payment.providerStatus).toUpperCase();
        var paypalStatus = safeText((orderResult && orderResult.payment && orderResult.payment.status) || (order && order.status)).toUpperCase();
        var isPending = providerStatus === 'CREATED'
            || providerStatus === 'PENDING'
            || providerStatus === 'AUTHORIZED'
            || paypalStatus === 'AUTHORIZED'
            || paypalStatus === 'PAYMENT_AUTHORIZED';
        var paypalSection = createCheckoutResultSection(t('paymentPayPal'));
        var paypalProfileUrl = safeText((orderResult && orderResult.paypalUrl) || getPayPalProfileUrl()).trim();

        message.textContent = orderResult && orderResult.demo
            ? t('previewPayPalSimulated')
            : (isPending ? t('paypalPaymentPending') : t('paypalPaymentCompleted'));

        if (order) {
            appendCheckoutResultHighlight(
                paypalSection.section,
                t('totalFinal'),
                formatCurrency(finalTotal, order.currency)
            );
        }
        if (paypalProfileUrl) {
            appendCheckoutResultItem(paypalSection.grid, t('paypalProfileLabel'), paypalProfileUrl, {
                href: paypalProfileUrl,
                linkText: t('paypalProfileLink'),
                copyValue: paypalProfileUrl
            });
        }
        if (orderResult && orderResult.payment && orderResult.payment.providerStatus) {
            appendCheckoutResultItem(paypalSection.grid, t('adminProviderStatus'), safeText(orderResult.payment.providerStatus));
        }
        grid.appendChild(paypalSection.section);
        renderPayPalPayerCard(paypalSection.section, orderResult);
        return;
    }

    message.textContent = '';
}

async function handleCheckoutReturnFromPayPal() {
    var url = new URL(window.location.href);
    var orderPublicId = safeText(url.searchParams.get('order_public_id'));
    var paypalOrderId = safeText(url.searchParams.get('token'));

    if (url.searchParams.get('paypal_cancel') === '1') {
        if (orderPublicId) {
            try {
                await cancelPayPalOrder(orderPublicId, paypalOrderId);
                if (ensureCustomerPortalSessionForOrder(orderPublicId)) {
                    await loadCustomerPortalDetail({ silent: true });
                }
            } catch (_) {
                // Keep cancellation feedback resilient even if the backend state update fails.
            }
        }
        setBookingStatus('idle');
        clearCheckoutQueryParams();
        showToast('error', t('whatsappErrorTitle'), t('paypalCheckoutCancelled'));
        return;
    }

    if (url.searchParams.get('paypal_return') !== '1' || !orderPublicId || !paypalOrderId) {
        return;
    }

    try {
        setBookingStatus('loading');
        var result = await finalizePayPalOrder(orderPublicId, paypalOrderId);
        if (ensureCustomerPortalSessionForOrder(orderPublicId)) {
            try {
                await loadCustomerPortalDetail({ silent: true });
            } catch (_) {
                // Keep checkout flow resilient even if portal refresh fails.
            }
        }
        clearCheckoutQueryParams();
        if (result && result.order && result.order.status === 'paid') {
            setBookingStatus('success');
            showToast('success', t('bookingSentTitle'), t('paypalPaymentCompleted'));
        } else {
            setBookingStatus('success');
            showToast('success', t('bookingSentTitle'), t('paypalPaymentPending'));
        }
        completeCheckout();
    } catch (error) {
        clearCheckoutQueryParams();
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), error.message || t('paypalPaymentError'));
    }
}

function initRevealObserver() {
    if (prefersReducedMotion) return;

    revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12
    });
}

function observeReveals(root) {
    var context = root || document;
    context.querySelectorAll('[data-reveal]').forEach(function (el) {
        if (prefersReducedMotion || !revealObserver) {
            el.classList.add('is-visible');
            return;
        }
        revealObserver.observe(el);
    });
}

function initCatalogHero() {
    var hero = document.getElementById('catalog-hero');
    var layerA = document.getElementById('catalog-hero-bg-a');
    var layerB = document.getElementById('catalog-hero-bg-b');
    if (!hero || !layerA || !layerB) return;

    applyCatalogHeroSlides(layerA, layerB, SEA_HERO_SLIDES);

    fetchCommonsSeaHeroSlides()
        .then(function (remoteSlides) {
            if (remoteSlides.length >= 2) {
                applyCatalogHeroSlides(layerA, layerB, remoteSlides);
            }
        })
        .catch(function (error) {
            console.warn('fetchCommonsSeaHeroSlides error', error);
        });
}

function scrollToTopTours() {
    var section = document.getElementById('catalog-grid');
    if (!section) return;
    section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function renderCatalog() {
    var grid = document.getElementById('catalog-grid');
    if (!grid) return;

    if (Object.keys(TOURS).length === 0) {
        grid.innerHTML = '<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';
        return;
    }

    var html = '';
    Object.values(TOURS).forEach(function (tour) {
        var title = getLocalizedPack(tour.card.title, state.language);
        var description = getLocalizedPack(tour.card.shortDescription, state.language);
        var imageUrl = escapeAttr(sanitizeImageUrl(buildImageUrl(tour.imageFolder, tour.card.thumbnail)));
        var tourId = escapeAttr(tour.id);
        var category = getTourCategory(tour);
        var categoryText = getLocalized(category.labels, state.language);
        var price = safeInt(tour.card.priceFrom, 0);
        var cardLabel = escapeAttr(t('viewDetails') + ': ' + getLocalized(tour.card.title, state.language));

        html += '<article class="tour-card">';
        html += '<a class="tour-card-link" href="#' + tourId + '" aria-label="' + cardLabel + '">';
        html += '<div class="tour-card-image">';
        html += '<img src="' + imageUrl + '" alt="' + escapeAttr(getLocalized(tour.card.title, state.language)) + '" loading="lazy">';
        html += '<span class="tour-card-badge tour-card-badge--' + category.className + '"><span data-es="' + escapeAttr(category.labels.es) + '" data-en="' + escapeAttr(category.labels.en) + '">' + escapeHtml(categoryText) + '</span></span>';
        html += '</div>';
        html += '<div class="tour-card-body">';
        html += '<h3 class="tour-card-title" data-es="' + title.es + '" data-en="' + title.en + '">' + title.text + '</h3>';
        html += '<p class="tour-card-desc" data-es="' + description.es + '" data-en="' + description.en + '">' + description.text + '</p>';
        html += '<div class="tour-card-footer">';
        html += '<div class="tour-card-price" aria-label="' + escapeAttr(t('from') + ' $' + price + ' USD') + '">';
        html += '<span class="tour-card-price-prefix" data-es="' + escapeAttr(I18N.es.from) + '" data-en="' + escapeAttr(I18N.en.from) + '">' + escapeHtml(t('from')) + '</span>';
        html += '<span class="tour-card-price-value">$' + price + '</span>';
        html += '<span class="tour-card-price-currency">USD</span>';
        html += '</div>';
        html += '<span class="tour-card-cta">';
        html += '<span class="tour-card-cta-label" data-es="' + escapeAttr(I18N.es.viewDetails) + '" data-en="' + escapeAttr(I18N.en.viewDetails) + '">' + escapeHtml(t('viewDetails')) + '</span>';
        html += '<span class="tour-card-cta-icon" aria-hidden="true">' + SVG.arrowRight + '</span>';
        html += '</span>';
        html += '</div></div></a></article>';
    });

    grid.innerHTML = html;

    observeReveals(document.getElementById('main-view'));
    applyDataTranslations();
}

function renderTourDetail(tour) {
    var container = document.getElementById('detail-view');
    if (!container) return;

    var lang = state.language;
    var imageFolder = safeText(tour.imageFolder);

    if (tour.addOns && Array.isArray(tour.addOns.options)) {
        tour.addOns.options.forEach(function (option) {
            if (state.addOns[option.id] === undefined) state.addOns[option.id] = false;
        });
    }

    var heroTitle = getLocalizedPack(tour.hero.title, lang);
    var heroSubtitle = getLocalizedPack(tour.hero.subtitle, lang);
    var heroDescription = getLocalizedPack(tour.hero.description, lang);
    var galleryTitle = getLocalizedPack(tour.gallery.title, lang);

    var galleryImages = Array.isArray(tour.gallery.images) && tour.gallery.images.length > 0 ? tour.gallery.images : [1];

    var gallerySlides = '';
    var galleryDots = '';
    galleryImages.forEach(function (imageRef, index) {
        var imageUrl = escapeAttr(sanitizeImageUrl(buildImageUrl(imageFolder, imageRef)));
        gallerySlides += '<div class="gallery-slide" style="background-image:url(\'' + imageUrl + '\')"></div>';
        galleryDots += '<button class="gallery-dot' + (index === 0 ? ' active' : '') + '" onclick="goToGallerySlide(' + index + ')" aria-label="Slide ' + (index + 1) + '"></button>';
    });

    var tableRows = '';
    (tour.pricing.tiers || []).forEach(function (tier) {
        var adults = safeInt(tier.adults, 0);
        var adultPrice = safeInt(tier.adultPrice, 0);
        tableRows += '<tr data-adults="' + adults + '" onclick="selectTier(' + adults + ')"><td>' + adults + '</td><td>$' + adultPrice + ' USD</td><td>$' + safeInt(tour.pricing.childPriceFlat, 0) + ' USD</td></tr>';
    });

    var includesItems = '';
    (tour.includes.items || []).forEach(function (item) {
        var value = getLocalizedPack(item, lang);
        includesItems += '<li><span class="check-icon">' + SVG.check + '</span><span data-es="' + value.es + '" data-en="' + value.en + '">' + value.text + '</span></li>';
    });

    var excludesItems = '';
    (tour.includes.excludes || []).forEach(function (item) {
        var value = getLocalizedPack(item, lang);
        excludesItems += '<li><span class="cross-icon">' + SVG.cross + '</span><span data-es="' + value.es + '" data-en="' + value.en + '">' + value.text + '</span></li>';
    });

    var itineraryItems = '';
    (tour.itinerary.steps || []).forEach(function (step, index) {
        var value = getLocalizedPack(step, lang);
        itineraryItems += '<li class="itinerary-item"><span class="itinerary-number">' + (index + 1) + '.</span><span data-es="' + value.es + '" data-en="' + value.en + '">' + value.text + '</span></li>';
    });

    var addOnCards = '';
    if (tour.addOns && Array.isArray(tour.addOns.options) && tour.addOns.options.length > 0) {
        tour.addOns.options.forEach(function (option) {
            var selected = Boolean(state.addOns[option.id]);
            var title = getLocalizedPack(option.title, lang);
            var desc = getLocalizedPack(option.description, lang);
            var optionId = escapeAttr(option.id);
            addOnCards += '<div class="addon-card' + (selected ? ' selected' : '') + '" data-addon-id="' + optionId + '" onclick="toggleAddon(this.dataset.addonId)">';
            addOnCards += '<div class="addon-content"><div class="addon-header">';
            addOnCards += '<span class="addon-title" data-es="' + title.es + '" data-en="' + title.en + '">' + title.text + '</span>';
            addOnCards += '<span class="addon-price">+$' + safeInt(option.pricePerPerson, 0) + ' USD / ' + t('person') + '</span>';
            addOnCards += '</div>';
            addOnCards += '<p class="addon-description" data-es="' + desc.es + '" data-en="' + desc.en + '">' + desc.text + '</p>';
            addOnCards += '<div class="addon-toggle"><span class="addon-checkbox">' + SVG.check + '</span><span>' + (selected ? t('selected') : t('select')) + '</span></div>';
            addOnCards += '</div></div>';
        });
    }

    var packingItems = '';
    (tour.packingList.items || []).forEach(function (item) {
        var value = getLocalizedPack(item, lang);
        packingItems += '<div class="packing-item"><span class="packing-icon">' + (SVG[item.icon] || '') + '</span><span data-es="' + value.es + '" data-en="' + value.en + '">' + value.text + '</span></div>';
    });

    var pricingTitle = getLocalizedPack(tour.pricing.sectionTitle, lang);
    var adultsHeader = getLocalizedPack(tour.pricing.tableHeader.adults, lang);
    var adultPriceHeader = getLocalizedPack(tour.pricing.tableHeader.adultPrice, lang);
    var childPriceHeader = getLocalizedPack(tour.pricing.tableHeader.childPrice, lang);
    var pricingNote = getLocalizedPack(tour.pricing.pricingNote, lang);
    var freeChildNote = getLocalizedPack(tour.pricing.freeChildNote, lang);
    var groupNote = getLocalizedPack(tour.pricing.groupNote, lang);

    var includesTitle = getLocalizedPack(tour.includes.sectionTitle, lang);
    var excludesTitle = getLocalizedPack(tour.includes.excludesTitle, lang);

    var itineraryTitle = getLocalizedPack(tour.itinerary.sectionTitle, lang);
    var itineraryWarning = getLocalizedPack(tour.itinerary.warning, lang);

    var addOnsTitle = tour.addOns && tour.addOns.sectionTitle ? getLocalizedPack(tour.addOns.sectionTitle, lang) : null;
    var packingTitle = getLocalizedPack(tour.packingList.sectionTitle, lang);
    var bookingTitle = getLocalizedPack(tour.booking.sectionTitle, lang);
    var bookingDesc = getLocalizedPack(tour.booking.description, lang);

    var html = '';
    html += '<div class="detail-nav reveal" data-reveal><button class="back-btn" onclick="navigateTo(\'catalog\')">' + SVG.back + ' <span data-es="' + escapeAttr(I18N.es.backHome) + '" data-en="' + escapeAttr(I18N.en.backHome) + '">' + escapeHtml(t('backHome')) + '</span></button></div>';

    html += '<section class="tour-hero reveal" data-reveal style="background-image:url(\'' + escapeAttr(sanitizeImageUrl(buildImageUrl(imageFolder, tour.hero.heroImage))) + '\')">';
    html += '<div class="tour-hero-overlay"><div class="tour-hero-content">';
    html += '<h2 data-es="' + heroTitle.es + '" data-en="' + heroTitle.en + '">' + heroTitle.text + '</h2>';
    html += '<h3 data-es="' + heroSubtitle.es + '" data-en="' + heroSubtitle.en + '">' + heroSubtitle.text + '</h3>';
    html += '</div></div></section>';

    html += '<section class="tour-section reveal" data-reveal><div class="section-divider"></div><p class="tour-description-text" data-es="' + heroDescription.es + '" data-en="' + heroDescription.en + '">' + heroDescription.text + '</p></section>';

    html += '<section class="tour-gallery reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
    html += '<h2 class="section-title" data-es="' + galleryTitle.es + '" data-en="' + galleryTitle.en + '">' + galleryTitle.text + '</h2>';
    html += '<div style="height:16px"></div><div class="gallery-container"><div class="gallery-slider" id="gallery-slider">' + gallerySlides + '</div>';
    html += '<button class="gallery-btn prev" onclick="moveGallery(-1)">' + SVG.arrowLeft + '</button>';
    html += '<button class="gallery-btn next" onclick="moveGallery(1)">' + SVG.arrowRight + '</button></div>';
    html += '<div class="gallery-dots" id="gallery-dots">' + galleryDots + '</div></div></section>';

    html += '<section class="pricing-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
    html += '<h2 class="section-title" data-es="' + pricingTitle.es + '" data-en="' + pricingTitle.en + '">' + pricingTitle.text + '</h2>';
    html += '<div style="height:8px"></div><p class="pricing-note" data-es="' + pricingNote.es + '" data-en="' + pricingNote.en + '">' + pricingNote.text + '</p>';
    html += '<div class="pricing-table-wrapper"><table class="pricing-table" id="pricing-table"><thead><tr>';
    html += '<th data-es="' + adultsHeader.es + '" data-en="' + adultsHeader.en + '">' + adultsHeader.text + '</th>';
    html += '<th data-es="' + adultPriceHeader.es + '" data-en="' + adultPriceHeader.en + '">' + adultPriceHeader.text + '</th>';
    html += '<th data-es="' + childPriceHeader.es + '" data-en="' + childPriceHeader.en + '">' + childPriceHeader.text + '</th>';
    html += '</tr></thead><tbody>' + tableRows + '</tbody></table></div>';
    html += '<p class="pricing-note" data-es="' + freeChildNote.es + '" data-en="' + freeChildNote.en + '">' + freeChildNote.text + '</p>';
    html += '<p class="pricing-note-highlight" data-es="' + groupNote.es + '" data-en="' + groupNote.en + '">' + groupNote.text + '</p>';

    html += '<div class="booking-configurator">';
    html += '<h3 class="configurator-title" data-es="' + escapeAttr(I18N.es.configureBooking) + '" data-en="' + escapeAttr(I18N.en.configureBooking) + '">' + escapeHtml(t('configureBooking')) + '</h3>';
    html += '<div class="configurator-row"><div class="configurator-label"><span class="configurator-label-main" data-es="' + escapeAttr(I18N.es.adultsLabel) + '" data-en="' + escapeAttr(I18N.en.adultsLabel) + '">' + escapeHtml(t('adultsLabel')) + '</span><span class="configurator-label-sub" id="adult-price-label">' + escapeHtml(t('selectQuantity')) + '</span></div><div class="quantity-selector"><button class="qty-btn" onclick="updateAdults(-1)">-</button><span class="qty-value" id="qty-adults">0</span><button class="qty-btn" onclick="updateAdults(1)">+</button></div></div>';
    html += '<div class="configurator-row"><div class="configurator-label"><span class="configurator-label-main" data-es="' + escapeAttr(I18N.es.childrenLabel) + '" data-en="' + escapeAttr(I18N.en.childrenLabel) + '">' + escapeHtml(t('childrenLabel')) + '</span><span class="configurator-label-sub">$' + safeInt(tour.pricing.childPriceFlat, 0) + ' USD ' + escapeHtml(t('perChild')) + '</span></div><div class="quantity-selector"><button class="qty-btn" onclick="updateChildren(-1)">-</button><span class="qty-value" id="qty-children">0</span><button class="qty-btn" onclick="updateChildren(1)">+</button></div></div>';
    html += '<div class="configurator-total"><span class="configurator-total-label">' + escapeHtml(t('total')) + ':</span><span class="configurator-total-amount" id="configurator-total">$0 USD</span></div>';
    html += '<button class="add-to-cart-btn" id="btn-add-tour" onclick="addTourToCart()" disabled>' + SVG.cart + ' <span data-es="' + escapeAttr(I18N.es.addToCart) + '" data-en="' + escapeAttr(I18N.en.addToCart) + '">' + escapeHtml(t('addToCart')) + '</span></button>';
    html += '</div></div></section>';

    html += '<section class="includes-excludes-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div><div class="includes-grid"><div class="includes-col"><h4 data-es="' + includesTitle.es + '" data-en="' + includesTitle.en + '">' + includesTitle.text + '</h4><ul>' + includesItems + '</ul></div><div class="includes-col"><h4 data-es="' + excludesTitle.es + '" data-en="' + excludesTitle.en + '">' + excludesTitle.text + '</h4><ul>' + excludesItems + '</ul></div></div></div></section>';

    html += '<section class="itinerary-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
    html += '<h2 class="section-title" data-es="' + itineraryTitle.es + '" data-en="' + itineraryTitle.en + '">' + itineraryTitle.text + '</h2><div style="height:16px"></div>';
    html += '<ul class="itinerary-list">' + itineraryItems + '</ul>';
    html += '<div class="itinerary-warning">' + SVG.warning + ' <span data-es="' + itineraryWarning.es + '" data-en="' + itineraryWarning.en + '">' + itineraryWarning.text + '</span></div>';
    if (tour.itinerary.comboNote) {
        var comboNote = getLocalizedPack(tour.itinerary.comboNote, lang);
        html += '<p class="itinerary-combo" data-es="' + comboNote.es + '" data-en="' + comboNote.en + '">' + comboNote.text + '</p>';
    }
    html += '</div></section>';

    if (addOnCards) {
        html += '<section class="addons-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
        html += '<h2 class="section-title" data-es="' + addOnsTitle.es + '" data-en="' + addOnsTitle.en + '">' + addOnsTitle.text + '</h2>';
        html += '<div style="height:16px"></div><div class="addons-grid">' + addOnCards + '</div></div></section>';
    }

    html += '<section class="packing-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
    html += '<h2 class="section-title" data-es="' + packingTitle.es + '" data-en="' + packingTitle.en + '">' + packingTitle.text + '</h2>';
    html += '<div style="height:16px"></div><div class="packing-grid">' + packingItems + '</div></div></section>';

    html += '<section class="booking-section reveal" data-reveal><div class="tour-section"><div class="section-divider"></div>';
    html += '<h2 class="section-title" data-es="' + bookingTitle.es + '" data-en="' + bookingTitle.en + '">' + bookingTitle.text + '</h2>';
    html += '<div style="height:16px"></div><p class="booking-text" data-es="' + bookingDesc.es + '" data-en="' + bookingDesc.en + '">' + bookingDesc.text + '</p></div></section>';

    container.innerHTML = html;
    observeReveals(container);

    var floatingBack = document.createElement('button');
    floatingBack.id = 'floating-back';
    floatingBack.className = 'floating-back-btn';
    floatingBack.onclick = function () { navigateTo('catalog'); };
    floatingBack.innerHTML = SVG.back + ' <span>' + escapeHtml(t('back')) + '</span>';
    document.body.appendChild(floatingBack);

    initGallerySlider();
    updateConfigurator();
    applyDataTranslations();
}

function stopGallerySlider() {
    clearInterval(galleryAutoSlide);
    galleryAutoSlide = null;
}

function initGallerySlider() {
    if (!state.currentTour) return;

    var tour = TOURS[state.currentTour];
    if (!tour || !tour.gallery || !Array.isArray(tour.gallery.images)) return;

    galleryState = { current: 0, total: tour.gallery.images.length || 1 };
    stopGallerySlider();

    if (!prefersReducedMotion && galleryState.total > 1) {
        galleryAutoSlide = setInterval(function () {
            moveGallery(1);
        }, 5000);
    }
}

function goToGallerySlide(index) {
    galleryState.current = index;
    var slider = document.getElementById('gallery-slider');
    if (slider) {
        slider.style.transform = 'translateX(-' + (index * 100) + '%)';
    }

    document.querySelectorAll('.gallery-dot').forEach(function (dot, dotIndex) {
        dot.classList.toggle('active', dotIndex === index);
    });
}

function moveGallery(direction) {
    if (!galleryState.total) return;
    var next = galleryState.current + direction;
    if (next < 0) next = galleryState.total - 1;
    if (next >= galleryState.total) next = 0;
    goToGallerySlide(next);
}

function getCurrentTour() {
    return state.currentTour ? TOURS[state.currentTour] : null;
}

function selectTier(adults) {
    state.adults = adults;
    var el = document.getElementById('qty-adults');
    if (el) el.textContent = adults;
    highlightTier();
    updateConfigurator();
}

function updateAdults(change) {
    state.adults = Math.max(0, Math.min(10, state.adults + change));
    var el = document.getElementById('qty-adults');
    if (el) el.textContent = state.adults;
    highlightTier();
    updateConfigurator();
}

function updateChildren(change) {
    state.children = Math.max(0, Math.min(10, state.children + change));
    var el = document.getElementById('qty-children');
    if (el) el.textContent = state.children;
    updateConfigurator();
}

function highlightTier() {
    document.querySelectorAll('#pricing-table tbody tr').forEach(function (row) {
        row.classList.toggle('selected', safeInt(row.dataset.adults, -1) === state.adults);
    });
}

function getAdultPrice() {
    var tour = getCurrentTour();
    if (!tour || state.adults === 0) return 0;

    var tier = (tour.pricing.tiers || []).find(function (item) {
        return safeInt(item.adults, -1) === state.adults;
    });
    return tier ? safeInt(tier.adultPrice, 0) : 0;
}

function calculateTotal() {
    var tour = getCurrentTour();
    if (!tour) return 0;

    var total = state.adults * getAdultPrice() + state.children * safeInt(tour.pricing.childPriceFlat, 0);
    var persons = state.adults + state.children;

    if (tour.addOns && Array.isArray(tour.addOns.options)) {
        tour.addOns.options.forEach(function (opt) {
            if (state.addOns[opt.id]) {
                total += safeInt(opt.pricePerPerson, 0) * persons;
            }
        });
    }

    return total;
}

function triggerNumberBump(elementId) {
    if (prefersReducedMotion) return;
    var el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
}

function updateConfigurator() {
    var adultPrice = getAdultPrice();
    var label = document.getElementById('adult-price-label');
    if (label) {
        label.textContent = state.adults > 0
            ? ('$' + adultPrice + ' USD ' + t('perAdult'))
            : t('selectQuantity');
    }

    var totalEl = document.getElementById('configurator-total');
    if (totalEl) {
        totalEl.textContent = '$' + calculateTotal() + ' USD';
        triggerNumberBump('configurator-total');
    }

    var button = document.getElementById('btn-add-tour');
    if (button) {
        button.disabled = (state.adults + state.children) === 0;
    }
}

function toggleAddon(addonId) {
    if (!addonId) return;

    state.addOns[addonId] = !state.addOns[addonId];

    var selector = '.addon-card[data-addon-id="' + cssEscapeValue(addonId) + '"]';
    var card = document.querySelector(selector);
    if (card) {
        card.classList.toggle('selected', state.addOns[addonId]);
        var toggleLabel = card.querySelector('.addon-toggle span:last-child');
        if (toggleLabel) {
            toggleLabel.textContent = state.addOns[addonId] ? t('selected') : t('select');
        }
    }

    updateConfigurator();
}

function addTourToCart() {
    var tour = getCurrentTour();
    if (!tour || state.adults + state.children === 0) return;

    resetCheckoutPreviewMode();

    var selectedAddOns = [];
    if (tour.addOns && Array.isArray(tour.addOns.options)) {
        tour.addOns.options.forEach(function (option) {
            if (state.addOns[option.id]) {
                selectedAddOns.push({
                    id: option.id,
                    name: getLocalized(option.title, state.language),
                    pricePerPerson: safeInt(option.pricePerPerson, 0)
                });
            }
        });
    }

    var firstImage = tour.gallery && Array.isArray(tour.gallery.images) && tour.gallery.images.length > 0
        ? tour.gallery.images[0]
        : 1;

    state.cart.push({
        id: tour.id + '-' + Date.now(),
        tourId: tour.id,
        name: getLocalized(tour.hero.title, state.language),
        image: sanitizeImageUrl(buildImageUrl(tour.imageFolder, firstImage)),
        adults: state.adults,
        children: state.children,
        adultPriceUSD: getAdultPrice(),
        childPriceUSD: safeInt(tour.pricing.childPriceFlat, 0),
        addOns: selectedAddOns,
        subtotalUSD: calculateTotal()
    });

    state.adults = 0;
    state.children = 0;
    Object.keys(state.addOns).forEach(function (key) {
        state.addOns[key] = false;
    });

    var adultsEl = document.getElementById('qty-adults');
    var childrenEl = document.getElementById('qty-children');
    if (adultsEl) adultsEl.textContent = '0';
    if (childrenEl) childrenEl.textContent = '0';

    highlightTier();
    document.querySelectorAll('.addon-card').forEach(function (card) {
        card.classList.remove('selected');
        var toggleLabel = card.querySelector('.addon-toggle span:last-child');
        if (toggleLabel) toggleLabel.textContent = t('select');
    });

    updateConfigurator();
    saveState();
    updateCartUI();

    showToast('success', t('added'), t('addedMessage'));

    var button = document.getElementById('btn-add-tour');
    if (button) {
        button.classList.add('added');
        var original = button.innerHTML;
        button.innerHTML = SVG.check + ' <span>' + escapeHtml(t('added')) + '</span>';

        setTimeout(function () {
            button.classList.remove('added');
            button.innerHTML = original;
            applyDataTranslations();
        }, 1200);
    }
}

function removeFromCart(index) {
    if (index < 0 || index >= state.cart.length) return;
    resetCheckoutPreviewMode();
    state.cart.splice(index, 1);
    saveState();
    updateCartUI();
    showToast('info', t('removed'), t('removedMessage'));
}

function getCartTotalUSD() {
    return state.cart.reduce(function (sum, item) {
        return sum + safeInt(item.subtotalUSD, 0);
    }, 0);
}

function formatFeeAmountValue(breakdown) {
    if (!breakdown || (breakdown.feePercent <= 0 && breakdown.feeAmount <= 0)) {
        return t('noCommission');
    }
    return formatCurrency(breakdown.feeAmount, CONFIG.payments && CONFIG.payments.currency);
}

function renderCheckoutPaymentCards() {
    var paypalTotalEl = document.getElementById('payment-option-paypal-total');
    var bankTotalEl = document.getElementById('payment-option-bank-transfer-total');
    var paypalDetails = document.getElementById('payment-option-paypal-details');
    var bankDetails = document.getElementById('payment-option-bank-transfer-details');
    var bankConfig = getDisplayBankTransferConfig();
    var paypalBreakdown = getCartPricingBreakdown('paypal');
    var bankBreakdown = getCartPricingBreakdown('bank_transfer');
    var paypalUrl = getPayPalProfileUrl();
    var paypalEmail = getPayPalAccountEmail();
    var transferReference = getTransferReferencePreview();
    var exactTransferReference = getLatestTransferReference();
    var paypalFee = getPaymentFeePercent('paypal');
    var bankName = safeText(bankConfig.bankName).trim();
    var beneficiary = safeText(bankConfig.beneficiary).trim();
    var clabe = safeText(bankConfig.clabe).trim();
    var account = safeText(bankConfig.account).trim();
    var cardNumber = safeText(bankConfig.cardNumber).trim();
    var swift = safeText(bankConfig.swift).trim();

    if (paypalTotalEl) paypalTotalEl.textContent = formatCurrency(paypalBreakdown.totalFinal, CONFIG.payments && CONFIG.payments.currency);
    if (bankTotalEl) bankTotalEl.textContent = formatCurrency(bankBreakdown.totalFinal, CONFIG.payments && CONFIG.payments.currency);

    if (paypalDetails) {
        paypalDetails.replaceChildren();
        if (paypalUrl) {
            appendPaymentCardDetail(paypalDetails, t('paypalProfileLabel'), paypalUrl, {
                href: paypalUrl,
                linkText: t('paypalProfileLink'),
                copyValue: paypalUrl
            });
        }
        if (paypalEmail) {
            appendPaymentCardDetail(paypalDetails, t('email'), paypalEmail, {
                copyValue: paypalEmail
            });
        }
        appendPaymentCardDetail(
            paypalDetails,
            t('commission'),
            paypalFee > 0 ? '+' + formatFeePercent(paypalFee) + '%' : t('noCommission')
        );
    }

    if (bankDetails) {
        bankDetails.replaceChildren();
        appendPaymentCardDetail(bankDetails, t('bankName'), bankName || t('notSpecified'), {
            copyValue: bankName
        });
        appendPaymentCardDetail(bankDetails, t('beneficiary'), beneficiary || t('notSpecified'), {
            copyValue: beneficiary
        });
        appendPaymentCardDetail(bankDetails, t('clabe'), clabe || t('notSpecified'), {
            copyValue: clabe
        });
        appendPaymentCardDetail(bankDetails, t('account'), account || t('notSpecified'), {
            copyValue: account
        });
        appendPaymentCardDetail(bankDetails, t('depositCard'), cardNumber || t('notSpecified'), {
            copyValue: cardNumber
        });
        appendPaymentCardDetail(bankDetails, t('swift'), swift || t('notSpecified'), {
            copyValue: swift
        });
        appendPaymentCardDetail(bankDetails, t('reference'), transferReference || t('referencePending'), {
            copyValue: exactTransferReference
        });
    }
}

function renderCheckoutPricingSummary() {
    var breakdown = getCartPricingBreakdown(getSelectedPaymentMethod());
    var subtotalText = formatCurrency(breakdown.subtotal, CONFIG.payments && CONFIG.payments.currency);
    var feeLabel = t('commission') + (breakdown.feePercent > 0 ? ' (+' + formatFeePercent(breakdown.feePercent) + '%)' : '');
    var feeText = formatFeeAmountValue(breakdown);
    var totalText = formatCurrency(breakdown.totalFinal, CONFIG.payments && CONFIG.payments.currency);

    var cartSubtotal = document.getElementById('cart-subtotal-amount');
    var cartFeeLabel = document.getElementById('cart-fee-label');
    var cartFee = document.getElementById('cart-fee-amount');
    var cartTotal = document.getElementById('cart-total-amount');
    var confirmSubtotal = document.getElementById('confirm-subtotal-amount');
    var confirmFeeLabel = document.getElementById('confirm-fee-label');
    var confirmFee = document.getElementById('confirm-fee-amount');
    var confirmTotal = document.getElementById('confirm-total-amount');
    var confirmMobileTotal = document.getElementById('confirm-mobile-total');
    var mobileAmount = document.getElementById('mobile-summary-total');
    var mobileLabel = document.getElementById('mobile-summary-label');

    if (cartSubtotal) cartSubtotal.textContent = subtotalText;
    if (cartFeeLabel) cartFeeLabel.textContent = feeLabel;
    if (cartFee) cartFee.textContent = feeText;
    if (cartTotal) {
        cartTotal.textContent = totalText;
        triggerNumberBump('cart-total-amount');
    }
    if (confirmSubtotal) confirmSubtotal.textContent = subtotalText;
    if (confirmFeeLabel) confirmFeeLabel.textContent = feeLabel;
    if (confirmFee) confirmFee.textContent = feeText;
    if (confirmTotal) confirmTotal.textContent = totalText;
    if (confirmMobileTotal) confirmMobileTotal.textContent = totalText;
    if (mobileAmount) mobileAmount.textContent = totalText;
    if (mobileLabel) mobileLabel.textContent = t('totalToPay');
    renderCheckoutPaymentCards();
}

function updateCartTotal() {
    renderCheckoutPricingSummary();
}

function loadState() {
    try {
        var cart = localStorage.getItem('lindotours_cart');
        var cartOwner = localStorage.getItem(CUSTOMER_CART_OWNER_KEY);
        var language = localStorage.getItem('lindotours_language');

        if (cart) state.cart = JSON.parse(cart);
        if (cartOwner) localCartOwner = cartOwner;
        if (language) state.language = normalizeLanguage(language);
        if (!readStoredCustomerAuthSession() && localCartOwner && localCartOwner !== 'guest') {
            state.cart = [];
            localCartOwner = 'guest';
        }
    } catch (e) {
        console.error('loadState error', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('lindotours_cart', JSON.stringify(state.cart));
        localStorage.setItem(CUSTOMER_CART_OWNER_KEY, getCustomerAuthSession() ? getCustomerAuthSession().profile.publicId : localCartOwner || 'guest');
        localStorage.setItem('lindotours_language', state.language);
    } catch (e) {
        console.error('saveState error', e);
    }

    if (getCustomerAuthSession()) {
        localCartOwner = getCustomerAuthSession().profile.publicId;
        scheduleCustomerCartSync();
    }
}

function openCartModal() {
    if (state.currentView !== 'checkout') {
        navigateTo('checkout');
        return;
    }

    lastFocusedBeforeCartModal = document.activeElement;
    setCheckoutLayoutActive(true);
    updateCartUI();
    focusCartModalPrimaryControl();
}

function closeCartModal() {
    var modal = document.getElementById('cart-modal');
    var wasOpen = Boolean(modal && modal.classList.contains('active'));
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';
    resetCheckoutPreviewMode();
    updateCartUI();
    state.checkoutMode = false;
    state.checkoutStep = 1;

    hideBookingPreviews();
    setBookingStatus('idle');
    goToCheckoutStep(1, {
        skipValidation: true,
        manageFocus: false,
        scrollIntoView: false,
        preserveStatus: true
    });

    if (state.currentView === 'checkout' || document.body.classList.contains('checkout-view-active')) {
        navigateTo('catalog');
        return;
    }

    if (wasOpen && lastFocusedBeforeCartModal && document.contains(lastFocusedBeforeCartModal)) {
        lastFocusedBeforeCartModal.focus();
    }
    lastFocusedBeforeCartModal = null;
}

function updateCartUI() {
    var cartCount = document.getElementById('cart-count');
    var cartItems = document.getElementById('cart-items');
    var totalSection = document.getElementById('cart-total-section');
    var mobileSummaryBar = document.getElementById('mobile-summary-bar');

    if (!cartCount || !cartItems || !totalSection) return;

    var totalPeople = 0;
    state.cart.forEach(function (item) {
        totalPeople += safeInt(item.adults, 0) + safeInt(item.children, 0);
    });

    cartCount.textContent = String(totalPeople);
    cartCount.classList.toggle('empty', totalPeople === 0);

    if (state.cart.length === 0) {
        var previewMode = isCheckoutPreviewModeActive();
        if (mobileSummaryBar) mobileSummaryBar.hidden = true;
        cartItems.innerHTML = '<div class="cart-empty">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
            '<p>' + escapeHtml(t('cartEmpty')) + '</p></div>';

        totalSection.style.display = 'none';
        hideBookingPreviews();
        clearCheckoutResult();

        if (previewMode) {
            state.checkoutMode = state.checkoutStep > 1;
        } else {
            state.checkoutMode = false;
            state.checkoutStep = 1;
            setBookingStatus('idle');
        }

        var customerSummary = document.getElementById('confirm-customer-summary');
        var cartSummary = document.getElementById('confirm-cart-summary');
        if (customerSummary) customerSummary.replaceChildren();
        if (cartSummary) cartSummary.replaceChildren();
    } else {
        if (mobileSummaryBar) mobileSummaryBar.hidden = false;
        var html = '';

        state.cart.forEach(function (item, index) {
            var adults = safeInt(item.adults, 0);
            var children = safeInt(item.children, 0);
            var qtyParts = [];
            if (adults > 0) qtyParts.push(adults + ' ' + t('adultUnit'));
            if (children > 0) qtyParts.push(children + ' ' + t('childUnit'));

            var addOnNames = getCartItemAddonNames(item);
            var qtyText = qtyParts.join(', ');
            if (addOnNames.length > 0) {
                qtyText += (qtyText ? ' + ' : '') + addOnNames.join(', ');
            }

            html += '<div class="cart-item">';
            html += '<div class="cart-item-image" style="background-image:url(\'' + escapeAttr(sanitizeImageUrl(item.image)) + '\')"></div>';
            html += '<div class="cart-item-details">';
            html += '<div class="cart-item-name">' + escapeHtml(getCartItemName(item)) + '</div>';
            html += '<div class="cart-item-qty">' + escapeHtml(qtyText) + '</div>';
            html += '</div>';
            html += '<div class="cart-item-price">$' + safeInt(item.subtotalUSD, 0) + ' USD</div>';
            html += '<button type="button" class="cart-item-remove" onclick="removeFromCart(' + index + ')" aria-label="' + escapeAttr(t('removeFromCartAria')) + '">&times;</button>';
            html += '</div>';
        });

        cartItems.innerHTML = html;
        totalSection.style.display = 'block';
        if (state.checkoutStep < 1 || state.checkoutStep > 3) state.checkoutStep = 1;
    }

    updateCartTotal();
    goToCheckoutStep(state.checkoutStep, {
        skipValidation: true,
        manageFocus: false,
        scrollIntoView: false,
        preserveStatus: true
    });
}

function showToast(type, title, message) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var icons = {
        success: SVG.check,
        error: SVG.cross,
        info: SVG.cart
    };

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var iconWrap = document.createElement('span');
    iconWrap.className = 'toast-icon';
    iconWrap.innerHTML = icons[type] || SVG.cart;

    var content = document.createElement('div');
    content.className = 'toast-content';

    var titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title || '';

    var msgEl = document.createElement('div');
    msgEl.className = 'toast-message';
    msgEl.textContent = message || '';

    content.appendChild(titleEl);
    content.appendChild(msgEl);
    toast.appendChild(iconWrap);
    toast.appendChild(content);
    container.appendChild(toast);

    setTimeout(function () {
        toast.style.animation = 'toastSlide 0.25s ease reverse';
        setTimeout(function () {
            toast.remove();
        }, 250);
    }, 4000);
}

function bindBookingPreviewListeners() {
    var formInputs = document.querySelectorAll('#booking-form input, #booking-form textarea, #booking-form select');
    formInputs.forEach(function (input) {
        input.addEventListener('input', updatePreviews);
        input.addEventListener('change', updatePreviews);
    });
}

function initDatePicker() {
    window.tourDatePicker = flatpickr('#tour-date', {
        locale: state.language === 'es' ? 'es' : 'default',
        minDate: 'today',
        dateFormat: getDateFormatByLanguage(),
        position: 'auto left',
        disableMobile: true,
        allowInput: false
    });
}

function initTimePicker() {
    var hour = document.getElementById('pickup-hour');
    var minute = document.getElementById('pickup-min');
    var meridian = document.getElementById('pickup-meridian');
    var hidden = document.getElementById('pickup-time');
    if (!hour || !minute || !hidden) return;

    function getMeridian(hourValue) {
        var hr = safeInt(hourValue, 0);
        if (hr >= 5 && hr <= 11) return 'AM';
        if (hr === 12 || hr === 1) return 'PM';
        return '';
    }

    function sync() {
        var currentMeridian = getMeridian(hour.value);
        if (meridian) meridian.textContent = currentMeridian || '--';

        if (hour.value && minute.value && currentMeridian) {
            hidden.value = hour.value + ':' + minute.value + ' ' + currentMeridian;
        } else {
            hidden.value = '';
        }
        updatePreviews();
    }

    hour.addEventListener('change', sync);
    minute.addEventListener('change', sync);
    sync();
}

function toggleOrderSummary() {
    var content = document.getElementById('order-summary-content');
    var toggle = document.getElementById('order-summary-toggle') || document.querySelector('.order-summary-toggle');
    if (!content || !toggle) return;

    var collapsed = content.classList.contains('collapsed');
    content.classList.toggle('collapsed', !collapsed);
    toggle.classList.toggle('collapsed', !collapsed);
    toggle.setAttribute('aria-expanded', String(collapsed));
}

function updateProgressIndicator(step) {
    for (var i = 1; i <= 3; i += 1) {
        var node = document.getElementById('step-' + i);
        if (!node) continue;
        node.classList.remove('active', 'completed');
        if (i < step) node.classList.add('completed');
        if (i === step) node.classList.add('active');
    }
}

function getCheckoutStepView(step) {
    return document.getElementById('checkout-step-' + step);
}

function appendConfirmSummaryRow(container, label, value) {
    if (!container) return;

    var row = document.createElement('div');
    row.className = 'confirm-summary-row';

    var labelEl = document.createElement('span');
    labelEl.className = 'confirm-summary-label';
    labelEl.textContent = label;

    var valueEl = document.createElement('span');
    valueEl.className = 'confirm-summary-value';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
}

function renderConfirmSummary() {
    var customerSummary = document.getElementById('confirm-customer-summary');
    var cartSummary = document.getElementById('confirm-cart-summary');
    if (!customerSummary || !cartSummary) return;

    customerSummary.replaceChildren();
    cartSummary.replaceChildren();

    if (state.cart.length === 0 && !isCheckoutPreviewModeActive()) return;

    var pickupTime = document.getElementById('pickup-time').value || t('notSpecified');
    var hotel = document.getElementById('customer-hotel').value || t('notSpecified');
    var comments = document.getElementById('customer-comments').value.trim() || t('noComments');

    appendConfirmSummaryRow(customerSummary, t('name'), document.getElementById('customer-name').value.trim() || t('notSpecified'));
    appendConfirmSummaryRow(customerSummary, t('email'), document.getElementById('customer-email').value.trim() || t('notSpecified'));
    appendConfirmSummaryRow(customerSummary, t('phone'), document.getElementById('customer-phone').value.trim() || t('notSpecified'));
    appendConfirmSummaryRow(customerSummary, t('tourDate'), document.getElementById('tour-date').value.trim() || t('notSpecified'));
    appendConfirmSummaryRow(customerSummary, t('pickupTime'), pickupTime);
    appendConfirmSummaryRow(customerSummary, t('hotel'), hotel);
    appendConfirmSummaryRow(customerSummary, t('comments'), comments);

    if (isCheckoutPreviewModeActive() && state.cart.length === 0) {
        appendConfirmSummaryRow(cartSummary, t('previewCheckoutCartLabel'), t('previewCheckoutCartValue'));
        renderCheckoutPricingSummary();
        return;
    }

    state.cart.forEach(function (item) {
        var adults = safeInt(item.adults, 0);
        var children = safeInt(item.children, 0);
        var travelerParts = [];
        if (adults > 0) travelerParts.push(adults + ' ' + t('confirmLineAdults'));
        if (children > 0) travelerParts.push(children + ' ' + t('confirmLineChildren'));

        var addOnNames = getCartItemAddonNames(item);
        var summaryLabel = getCartItemName(item) + ' (' + travelerParts.join(', ') + ')';
        if (addOnNames.length > 0) summaryLabel += ' + ' + addOnNames.join(', ');

        appendConfirmSummaryRow(cartSummary, summaryLabel, '$' + safeInt(item.subtotalUSD, 0) + ' USD');
    });

    renderCheckoutPricingSummary();
}

function focusCheckoutStep(step) {
    var target = null;
    if (step === 1) {
        target = document.getElementById('checkout-btn');
    } else if (step === 2) {
        target = document.getElementById('customer-name');
    } else if (step === 3) {
        target = document.getElementById('confirm-step-title');
        if (target) target.setAttribute('tabindex', '-1');
    }

    if (!target || target.offsetParent === null || target.disabled) {
        target = document.querySelector('.close-modal');
    }

    if (target) target.focus();
}

function goToCheckoutStep(step, options) {
    var opts = Object.assign({
        skipValidation: false,
        manageFocus: true,
        scrollIntoView: true,
        preserveStatus: false,
        allowEmptyCart: false
    }, options || {});

    var nextStep = safeInt(step, 1);
    if (nextStep < 1 || nextStep > 3) nextStep = 1;
    if (state.cart.length === 0 && !(opts.allowEmptyCart || isCheckoutPreviewModeActive())) nextStep = 1;

    var form = document.getElementById('booking-form');
    if (nextStep === 3 && !opts.skipValidation && !isCheckoutPreviewModeActive()) {
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            hideBookingPreviews();
            showToast('error', t('whatsappErrorTitle'), t('confirmStepInvalid'));
            return false;
        }
    }

    state.checkoutStep = nextStep;
    state.checkoutMode = nextStep > 1;

    var modal = document.getElementById('cart-modal');
    var dialog = document.getElementById('cart-modal-dialog');
    if (modal) modal.setAttribute('data-checkout-step', String(nextStep));
    if (dialog) dialog.setAttribute('data-checkout-step', String(nextStep));

    for (var i = 1; i <= 3; i += 1) {
        var view = getCheckoutStepView(i);
        if (!view) continue;

        var isActive = i === nextStep;
        view.classList.toggle('active', isActive);
        view.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    }

    var checkoutForm = document.getElementById('checkout-form');

    if (checkoutForm) checkoutForm.classList.toggle('active', nextStep === 2);
    updatePaymentMethodUI();

    updateProgressIndicator(nextStep);

    if (nextStep >= 2) updatePreviews();
    if (nextStep === 3) renderConfirmSummary();

    if (!opts.preserveStatus) setBookingStatus('idle');

    if (opts.scrollIntoView) {
        var activeView = getCheckoutStepView(nextStep);
        if (activeView) {
            setTimeout(function () {
                activeView.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            }, 80);
        }
    }

    if (opts.manageFocus) {
        setTimeout(function () {
            focusCheckoutStep(nextStep);
        }, 10);
    }

    return true;
}

function buildWhatsAppMessage(options) {
    var opts = options || {};
    var lines = [];
    var breakdown = getCartPricingBreakdown(getSelectedPaymentMethod());

    lines.push(t('newBooking'));
    lines.push('');
    lines.push('*' + document.getElementById('customer-name').value + '*');
    lines.push(document.getElementById('tour-date').value);

    var pickupTime = document.getElementById('pickup-time').value;
    if (pickupTime) lines.push(pickupTime + ' (MX Time)');

    lines.push(document.getElementById('customer-phone').value);
    lines.push('');
    lines.push(t('tours'));

    state.cart.forEach(function (item) {
        var line = '- ' + getCartItemName(item) + ' (' + safeInt(item.adults, 0) + ' ' + t('adultUnit') + ', ' + safeInt(item.children, 0) + ' ' + t('childUnit') + ')';
        var addOnNames = getCartItemAddonNames(item);
        if (addOnNames.length > 0) line += ' + ' + addOnNames.join(', ');
        line += ' - $' + safeInt(item.subtotalUSD, 0) + ' USD';
        lines.push(line);
    });

    lines.push('');
    lines.push('*' + t('subtotal').toUpperCase() + ': ' + formatCurrency(breakdown.subtotal, CONFIG.payments && CONFIG.payments.currency) + '*');
    lines.push('*' + t('commission').toUpperCase() + ': ' + formatFeeAmountValue(breakdown) + '*');
    lines.push('*' + t('totalFinal').toUpperCase() + ': ' + formatCurrency(breakdown.totalFinal, CONFIG.payments && CONFIG.payments.currency) + '*');

    if (opts.orderPublicId) {
        lines.push('');
        lines.push('*' + t('orderNumber').toUpperCase() + ':* ' + opts.orderPublicId);
    }

    var comments = document.getElementById('customer-comments').value.trim();
    if (comments) {
        lines.push('');
        lines.push(comments);
    }

    return lines.join('\n');
}

function buildPaymentSupportWhatsAppMessage() {
    var breakdown = getCartPricingBreakdown(getSelectedPaymentMethod());
    var lines = [
        t('supportPaymentMessage'),
        '',
        '*' + document.getElementById('customer-name').value + '*',
        document.getElementById('tour-date').value,
        document.getElementById('customer-phone').value,
        '',
        '*' + t('selectedPaymentMethod') + ':* ' + normalizePaymentMethodLabel(getSelectedPaymentMethod()),
        '*' + t('subtotal') + ':* ' + formatCurrency(breakdown.subtotal, CONFIG.payments && CONFIG.payments.currency),
        '*' + t('commission') + ':* ' + formatFeeAmountValue(breakdown),
        '*' + t('totalFinal') + ':* ' + formatCurrency(breakdown.totalFinal, CONFIG.payments && CONFIG.payments.currency)
    ];

    var comments = safeText(document.getElementById('customer-comments').value).trim();
    if (comments) {
        lines.push('');
        lines.push(comments);
    }

    return lines.join('\n');
}

function openPaymentSupportWhatsApp() {
    if (!CONFIG.whatsapp || !CONFIG.whatsapp.phone) return;
    if (!validateCheckoutSubmission()) return;
    window.open('https://wa.me/' + CONFIG.whatsapp.phone + '?text=' + encodeURIComponent(buildPaymentSupportWhatsAppMessage()), '_blank');
}

function openDemoSupportEmail(orderResult, payload, summary) {
    var email = safeText(CONFIG.contact && CONFIG.contact.email).trim();
    if (!email) return;

    var subject = state.language === 'en'
        ? 'Demo booking ' + safeText(orderResult && orderResult.order && orderResult.order.publicId)
        : 'Reservacion demo ' + safeText(orderResult && orderResult.order && orderResult.order.publicId);
    var body = [
        t('name') + ': ' + safeText(payload && payload.name),
        t('email') + ': ' + safeText(payload && payload.email),
        t('phone') + ': ' + safeText(payload && payload.phone),
        t('tourDate') + ': ' + safeText(payload && payload.date),
        t('pickupTime') + ': ' + safeText(payload && payload.pickup_time),
        t('hotel') + ': ' + safeText(payload && payload.hotel),
        '',
        summary || '',
        '',
        t('totalFinal') + ': $' + safeInt(payload && payload.total, 0) + ' USD'
    ].join('\n');

    window.location.href = 'mailto:' + encodeURIComponent(email)
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
}

function appendEmailRow(container, label, value) {
    var row = document.createElement('div');
    row.className = 'email-row';

    var labelEl = document.createElement('span');
    labelEl.className = 'email-label';
    labelEl.textContent = label;

    var valueEl = document.createElement('span');
    valueEl.className = 'email-value';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
}

function updatePreviews() {
    var form = document.getElementById('booking-form');
    if (!form || !form.checkValidity()) {
        hideBookingPreviews();
        return;
    }

    hideBookingPreviews();
    if (state.checkoutStep === 3) renderConfirmSummary();
}

function proceedToCheckout() {
    goToCheckoutStep(2);
}

function startCheckoutPreview() {
    clearCheckoutResult();
    activateCheckoutPreviewMode();
    openCartModal();
    goToCheckoutStep(2, { allowEmptyCart: true });
}

function proceedToConfirmation() {
    goToCheckoutStep(3);
}

function buildBookingPayload() {
    var paymentMethod = getSelectedPaymentMethod();
    var breakdown = getCartPricingBreakdown(paymentMethod);

    return {
        name: document.getElementById('customer-name').value,
        email: document.getElementById('customer-email').value,
        phone: document.getElementById('customer-phone').value,
        date: document.getElementById('tour-date').value,
        pickup_time: document.getElementById('pickup-time').value || '',
        hotel: document.getElementById('customer-hotel').value || '',
        comments: document.getElementById('customer-comments').value || '',
        cart: state.cart,
        subtotal: breakdown.subtotal,
        feePercent: breakdown.feePercent,
        feeAmount: breakdown.feeAmount,
        total: breakdown.totalFinal,
        totalFinal: breakdown.totalFinal
    };
}

function validateCheckoutSubmission() {
    if (state.cart.length === 0) return false;
    if (state.checkoutStep !== 3) {
        if (!goToCheckoutStep(3)) return false;
    }

    var form = document.getElementById('booking-form');
    if (!form || !form.checkValidity()) {
        if (form) form.reportValidity();
        return false;
    }

    return true;
}

function setBookingButtonsLoading(loading) {
    var payPayPalBtn = document.getElementById('pay-paypal-btn');
    var bankTransferBtn = document.getElementById('bank-transfer-btn');
    var payPayPalCardBtn = document.getElementById('payment-option-paypal-cta');
    var bankTransferCardBtn = document.getElementById('payment-option-bank-transfer-cta');
    var confirmMobilePayBtn = document.getElementById('confirm-mobile-pay-btn');

    [payPayPalBtn, bankTransferBtn, payPayPalCardBtn, bankTransferCardBtn, confirmMobilePayBtn].forEach(function (btn) {
        if (!btn) return;
        btn.disabled = loading;
        btn.classList.toggle('loading', loading);
    });
}

function setBookingStatus(status) {
    var statusEl = document.getElementById('booking-status');
    if (!statusEl) return;

    statusEl.classList.remove('loading', 'success', 'error');

    if (status === 'idle') {
        statusEl.textContent = '';
        return;
    }

    if (status === 'loading') {
        statusEl.textContent = t('bookingStatusLoading');
        statusEl.classList.add('loading');
    } else if (status === 'success') {
        statusEl.textContent = t('bookingStatusSuccess');
        statusEl.classList.add('success');
    } else if (status === 'error') {
        statusEl.textContent = t('bookingStatusError');
        statusEl.classList.add('error');
    }
}

function resetBookingForm() {
    var form = document.getElementById('booking-form');
    if (form) form.reset();

    if (window.tourDatePicker) {
        window.tourDatePicker.clear();
    }

    var pickupTime = document.getElementById('pickup-time');
    if (pickupTime) pickupTime.value = '';

    var pickupMeridian = document.getElementById('pickup-meridian');
    if (pickupMeridian) pickupMeridian.textContent = '--';

    var hotelInput = document.getElementById('customer-hotel');
    if (hotelInput) {
        delete hotelInput.dataset.hotel;
        delete hotelInput.dataset.zone;
    }

    hideMapBtn();
    closeAC();
    setHotelNoMatchHint(false);
    hideBookingPreviews();
    clearCheckoutResult();
    resetCheckoutPreviewMode({ restoreForm: false });
    state.selectedPaymentMethod = getDefaultPaymentMethod();
    updatePaymentMethodUI();
}

function completeCheckout() {
    state.cart = [];
    resetBookingForm();
    saveState();
    state.checkoutMode = false;
    state.checkoutStep = 1;
    updateCartUI();
    goToCheckoutStep(1, {
        skipValidation: true,
        manageFocus: false,
        scrollIntoView: false,
        preserveStatus: true
    });

    setTimeout(function () {
        closeCartModal();
    }, 1500);
}

async function sendBookingEmail() {
    if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;

    updateProgressIndicator(3);
    bookingSubmissionInProgress = true;
    setBookingButtonsLoading(true);
    setBookingStatus('loading');

    try {
        var payload = buildBookingPayload();
        var orderResult = await createCheckoutOrder('manual_contact');

        var summary = state.cart.map(function (item) {
            var line = getCartItemName(item) + ': ' + safeInt(item.adults, 0) + ' ' + t('adultUnit') + ', ' + safeInt(item.children, 0) + ' ' + t('childUnit');
            var addOnNames = getCartItemAddonNames(item);
            if (addOnNames.length > 0) line += ' + ' + addOnNames.join(', ');
            line += ' - $' + safeInt(item.subtotalUSD, 0) + ' USD';
            return line;
        }).join('\n');

        if (CONFIG.emailjs && CONFIG.emailjs.serviceId && CONFIG.emailjs.templateId && typeof emailjs !== 'undefined') {
            if (isDemoModeEnabled()) {
                openDemoSupportEmail(orderResult, payload, summary);
            } else {
                await emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, {
                    customer_name: payload.name,
                    customer_email: payload.email,
                    customer_phone: payload.phone,
                    tour_date: payload.date,
                    pickup_time: payload.pickup_time || t('notSpecified'),
                    customer_hotel: payload.hotel || t('notSpecified'),
                    customer_comments: payload.comments || t('noComments'),
                    cart_summary: summary,
                    total_amount: '$' + payload.total + ' USD',
                    order_public_id: orderResult.order.publicId
                });
            }
        }

        setBookingStatus('success');
        showToast('success', t('bookingSentTitle'), t('manualOrderCreated'));
        completeCheckout();
    } catch (e) {
        console.error(e);
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), e.message || t('emailFallbackError'));
    } finally {
        bookingSubmissionInProgress = false;
        setBookingButtonsLoading(false);
    }
}

async function sendToWhatsApp() {
    if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;

    updateProgressIndicator(3);
    bookingSubmissionInProgress = true;
    setBookingButtonsLoading(true);
    setBookingStatus('loading');

    try {
        var orderResult = await createCheckoutOrder('manual_contact');

        var message = buildWhatsAppMessage({ orderPublicId: orderResult.order.publicId });
        window.open('https://wa.me/' + CONFIG.whatsapp.phone + '?text=' + encodeURIComponent(message), '_blank');

        setBookingStatus('success');
        showToast('success', t('bookingSentTitle'), t('bookingSavedForWhatsApp'));
        completeCheckout();
    } catch (e) {
        console.error(e);
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), e.message || t('whatsappErrorMessage'));
    } finally {
        bookingSubmissionInProgress = false;
        setBookingButtonsLoading(false);
    }
}

function buildPreviewOrderPublicId() {
    return 'LT-DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function buildPreviewCheckoutResult(paymentMethod) {
    var method = paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'paypal';
    var breakdown = getCartPricingBreakdown(method);
    var bankConfig = getDisplayBankTransferConfig();
    var publicId = buildPreviewOrderPublicId();
    var referenceCode = (bankConfig.referencePrefix || 'LT') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    var currency = CONFIG.payments && CONFIG.payments.currency ? CONFIG.payments.currency : 'USD';
    var isPayPal = method === 'paypal';
    var customerNameInput = document.getElementById('customer-name');
    var customerEmailInput = document.getElementById('customer-email');
    var customerName = safeText(customerNameInput && customerNameInput.value).trim();
    var customerEmail = safeText(customerEmailInput && customerEmailInput.value).trim();

    return {
        demo: true,
        paypalUrl: safeText(CONFIG.demoMode && CONFIG.demoMode.paypalUrl).trim(),
        order: {
            publicId: publicId,
            subtotal: breakdown.subtotal,
            feePercent: breakdown.feePercent,
            feeAmount: breakdown.feeAmount,
            total: breakdown.totalFinal,
            totalFinal: breakdown.totalFinal,
            currency: currency,
            paymentMethod: method,
            status: isPayPal ? 'paid' : 'awaiting_transfer'
        },
        payment: {
            provider: method,
            status: isPayPal ? 'paid' : 'awaiting_transfer',
            providerStatus: isPayPal ? 'COMPLETED' : 'PENDING_TRANSFER'
        },
        payer: isPayPal ? {
            fullName: customerName || 'PayPal Demo User',
            email: customerEmail || 'demo.paypal@lindotours.test',
            payerId: 'PAYER-DEMO',
            countryCode: 'MX',
            imageUrl: PAYPAL_PAYER_AVATAR_ROUTE
        } : null,
        bankTransfer: !isPayPal ? {
            bankName: bankConfig.bankName,
            beneficiary: bankConfig.beneficiary,
            clabe: bankConfig.clabe,
            account: bankConfig.account,
            cardNumber: bankConfig.cardNumber,
            swift: bankConfig.swift,
            reference: referenceCode,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
        } : null
    };
}

async function simulatePreviewCheckout(paymentMethod) {
    if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;

    updateProgressIndicator(3);
    bookingSubmissionInProgress = true;
    setBookingButtonsLoading(true);
    setBookingStatus('loading');

    try {
        await new Promise(function (resolve) {
            window.setTimeout(resolve, 380);
        });

        var orderResult = buildPreviewCheckoutResult(paymentMethod);
        renderCheckoutResult(orderResult, paymentMethod);
        setBookingStatus('success');
        showToast(
            'success',
            t('bookingSaved'),
            paymentMethod === 'paypal' ? t('previewPayPalSimulated') : t('previewTransferSimulated')
        );
        syncCheckoutActionButtons();
    } catch (error) {
        console.error(error);
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), error.message || t('bookingFailed'));
    } finally {
        bookingSubmissionInProgress = false;
        setBookingButtonsLoading(false);
    }
}

async function startPayPalCheckout() {
    if (isCheckoutPreviewModeActive()) {
        await simulatePreviewCheckout('paypal');
        return;
    }
    if (isDemoModeEnabled()) {
        if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;
        var demoPayPalUrl = safeText(CONFIG.demoMode && CONFIG.demoMode.paypalUrl).trim();
        if (demoPayPalUrl) {
            window.open(demoPayPalUrl, '_blank');
        }
        await simulatePreviewCheckout('paypal');
        return;
    }
    if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;
    if (!CONFIG.payments || !CONFIG.payments.paypal || !CONFIG.payments.paypal.enabled) {
        showToast('error', t('whatsappErrorTitle'), t('paymentMethodUnavailable'));
        return;
    }

    updateProgressIndicator(3);
    bookingSubmissionInProgress = true;
    setBookingButtonsLoading(true);
    setBookingStatus('loading');

    try {
        var orderResult = await createCheckoutOrder('paypal');
        var paypalOrder = await createPayPalRedirectOrder(orderResult.order.publicId);
        if (!paypalOrder.approveUrl) {
            throw new Error(t('paypalPaymentError'));
        }

        setBookingStatus('loading');
        showToast('success', t('bookingSaved'), t('paypalRedirecting'));
        window.location.href = paypalOrder.approveUrl;
    } catch (error) {
        console.error(error);
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), error.message || t('paypalPaymentError'));
        bookingSubmissionInProgress = false;
        setBookingButtonsLoading(false);
    }
}

async function startBankTransferCheckout() {
    if (isCheckoutPreviewModeActive()) {
        await simulatePreviewCheckout('bank_transfer');
        return;
    }
    if (isDemoModeEnabled()) {
        if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;
        await simulatePreviewCheckout('bank_transfer');
        return;
    }
    if (bookingSubmissionInProgress || !validateCheckoutSubmission()) return;
    if (!CONFIG.payments || !CONFIG.payments.bankTransfer || !CONFIG.payments.bankTransfer.enabled) {
        showToast('error', t('whatsappErrorTitle'), t('paymentMethodUnavailable'));
        return;
    }

    updateProgressIndicator(3);
    bookingSubmissionInProgress = true;
    setBookingButtonsLoading(true);
    setBookingStatus('loading');

    try {
        var orderResult = await createCheckoutOrder('bank_transfer');
        renderCheckoutResult(orderResult, 'bank_transfer');
        setBookingStatus('success');
        showToast('success', t('bookingSaved'), t('transferInstructionsReady'));
        syncCheckoutActionButtons();
    } catch (error) {
        console.error(error);
        setBookingStatus('error');
        showToast('error', t('whatsappErrorTitle'), error.message || t('bookingFailed'));
    } finally {
        bookingSubmissionInProgress = false;
        setBookingButtonsLoading(false);
    }
}

async function submitTransferProofUpload(options) {
    var opts = options || {};
    var publicId = safeText(opts.publicId);
    var fileInput = opts.fileInput;
    var button = opts.button;
    var total = safeInt(opts.amount, 0);
    var reference = safeText(opts.reference);
    var access = getActiveCustomerOrderAccess(publicId);

    if (!access) {
        throw new Error(t('portalSessionExpired'));
    }
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        throw new Error(t('transferProofMissing'));
    }

    var formData = new FormData();
    formData.append('proof', fileInput.files[0]);
    formData.append('submitted_reference', reference);
    formData.append('submitted_amount', String(total));

    if (button) button.disabled = true;
    try {
        var response = await fetch(access.transferPath, {
            method: 'POST',
            headers: access.headers,
            body: formData
        });

        if (!response.ok) {
            var message = t('uploadProofError');
            try {
                var body = await response.json();
                if (body && body.error) message = body.error;
            } catch (_) {
                // ignore
            }
            throw new Error(message);
        }

        fileInput.value = '';
        return response.json();
    } finally {
        if (button) button.disabled = false;
    }
}

async function uploadTransferProof() {
    var orderResult = state.latestCheckoutOrder;
    var proofInput = document.getElementById('transfer-proof-file');
    var uploadBtn = document.getElementById('upload-transfer-proof-btn');

    if (!orderResult || !orderResult.order || orderResult.order.paymentMethod !== 'bank_transfer') return;
    if (!proofInput || !proofInput.files || !proofInput.files[0]) {
        showToast('error', t('whatsappErrorTitle'), t('transferProofMissing'));
        return;
    }

    try {
        await submitTransferProofUpload({
            publicId: orderResult.order.publicId,
            amount: orderResult.order.total,
            reference: orderResult.bankTransfer && orderResult.bankTransfer.reference ? orderResult.bankTransfer.reference : '',
            fileInput: proofInput,
            button: uploadBtn
        });
        showToast('success', t('bookingSaved'), t('uploadProofSuccess'));
    } catch (error) {
        console.error(error);
        showToast('error', t('whatsappErrorTitle'), error.message || t('uploadProofError'));
    }
}

async function uploadCustomerPortalTransferProof() {
    var detail = customerPortalState.data;
    var proofInput = document.getElementById('portal-transfer-proof-file');
    var uploadBtn = document.getElementById('portal-upload-transfer-proof-btn');
    if (!detail || !detail.order) return;

    try {
        await submitTransferProofUpload({
            publicId: detail.order.publicId,
            amount: detail.order.total,
            reference: detail.order.bankReference || '',
            fileInput: proofInput,
            button: uploadBtn
        });
        if (customerPortalState.source === 'account') {
            await selectCustomerAccountOrder(detail.order.publicId, { silent: true });
            setCustomerAuthStatus('success', t('uploadProofSuccess'));
        } else {
            await loadCustomerPortalDetail({ silent: true });
            setOrderLookupStatus('success', t('uploadProofSuccess'));
        }
        showToast('success', t('myOrdersTitle'), t('uploadProofSuccess'));
    } catch (error) {
        console.error(error);
        if (customerPortalState.source === 'account') {
            setCustomerAuthStatus('error', error.message || t('uploadProofError'));
        } else {
            setOrderLookupStatus('error', error.message || t('uploadProofError'));
        }
        showToast('error', t('myOrdersTitle'), error.message || t('uploadProofError'));
    }
}

var hotelAC = { wrap: null, list: null, hint: null, idx: -1, open: false };

function setHotelNoMatchHint(visible) {
    if (!hotelAC.hint) {
        hotelAC.hint = document.getElementById('hotel-no-match-hint');
    }
    if (!hotelAC.hint) return;

    if (visible) {
        hotelAC.hint.removeAttribute('hidden');
    } else {
        hotelAC.hint.setAttribute('hidden', '');
    }
}

function initHotelAutocomplete() {
    var input = document.getElementById('customer-hotel');
    if (!input || hotelAC.wrap) return;

    var wrap = document.createElement('div');
    wrap.className = 'ac-wrap';

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var list = document.createElement('ul');
    list.className = 'ac-list';
    wrap.appendChild(list);

    hotelAC.wrap = wrap;
    hotelAC.list = list;
    hotelAC.hint = document.getElementById('hotel-no-match-hint');
    input.setAttribute('autocomplete', 'off');
    setHotelNoMatchHint(false);

    input.addEventListener('input', function () {
        delete this.dataset.hotel;
        delete this.dataset.zone;
        filterHotels(this.value);
        hideMapBtn();
    });

    input.addEventListener('focus', function () {
        if (this.value.length >= 2) filterHotels(this.value);
    });

    input.addEventListener('blur', function () {
        var value = this.value.trim();
        setHotelNoMatchHint(false);
        setTimeout(function () {
            closeAC();
        }, 120);
        if (value.length > 2) {
            setTimeout(function () {
                showMapBtn(value);
            }, 300);
        }
    });

    input.addEventListener('keydown', function (e) {
        var items = list.querySelectorAll('.ac-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            hotelAC.idx = Math.min(hotelAC.idx + 1, items.length - 1);
            highlightAC(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            hotelAC.idx = Math.max(hotelAC.idx - 1, 0);
            highlightAC(items);
        } else if (e.key === 'Enter' && hotelAC.open && hotelAC.idx >= 0) {
            e.preventDefault();
            if (items[hotelAC.idx]) items[hotelAC.idx].dispatchEvent(new Event('mousedown'));
        } else if (e.key === 'Escape') {
            closeAC();
        }
    });

    document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) closeAC();
    });
}

function createHighlightedName(text, query) {
    var fragment = document.createDocumentFragment();
    var source = safeText(text);
    var lower = source.toLowerCase();
    var q = safeText(query).toLowerCase();
    var idx = lower.indexOf(q);

    if (idx === -1 || !q) {
        fragment.appendChild(document.createTextNode(source));
        return fragment;
    }

    fragment.appendChild(document.createTextNode(source.slice(0, idx)));
    var strong = document.createElement('strong');
    strong.textContent = source.slice(idx, idx + q.length);
    fragment.appendChild(strong);
    fragment.appendChild(document.createTextNode(source.slice(idx + q.length)));
    return fragment;
}

function filterHotels(query) {
    var list = hotelAC.list;
    hotelAC.idx = -1;
    var normalized = safeText(query).trim();

    if (!list || normalized.length < 2) {
        closeAC();
        setHotelNoMatchHint(false);
        return;
    }

    var lower = normalized.toLowerCase();
    var results = HOTELS.filter(function (hotel) {
        return hotel.n.toLowerCase().indexOf(lower) !== -1 || hotel.z.toLowerCase().indexOf(lower) !== -1;
    }).slice(0, 12);

    if (results.length === 0) {
        closeAC();
        setHotelNoMatchHint(true);
        return;
    }

    setHotelNoMatchHint(false);
    list.innerHTML = '';

    results.forEach(function (hotel) {
        var item = document.createElement('li');
        item.className = 'ac-item';

        var name = document.createElement('span');
        name.className = 'ac-name';
        name.appendChild(createHighlightedName(hotel.n, lower));

        var zone = document.createElement('span');
        zone.className = 'ac-zone';
        zone.textContent = hotel.z;

        item.appendChild(name);
        item.appendChild(zone);

        item.addEventListener('mousedown', function (event) {
            event.preventDefault();
            selectHotel(hotel.n, hotel.z);
        });

        list.appendChild(item);
    });

    list.style.display = 'block';
    hotelAC.open = true;
}

function highlightAC(items) {
    items.forEach(function (item, index) {
        item.classList.toggle('ac-active', index === hotelAC.idx);
        if (index === hotelAC.idx) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

function selectHotel(name, zone) {
    var input = document.getElementById('customer-hotel');
    if (!input) return;

    input.value = name + ' (' + zone + ')';
    input.dataset.hotel = name;
    input.dataset.zone = zone;

    closeAC();
    setHotelNoMatchHint(false);
    showMapBtn(name);
    updatePreviews();
}

function closeAC() {
    if (hotelAC.list) {
        hotelAC.list.style.display = 'none';
    }
    hotelAC.open = false;
    hotelAC.idx = -1;
}

function showMapBtn(hotelName) {
    hideMapBtn();

    if (!hotelName || hotelName.length < 3) return;

    var wrap = hotelAC.wrap || document.getElementById('customer-hotel').parentNode;
    if (!wrap) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotel-map-btn';
    btn.title = t('mapsTitle');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <span></span>';

    var label = btn.querySelector('span');
    if (label) label.textContent = t('maps');

    btn.onclick = function () {
        openHotelMap(hotelName);
    };

    wrap.appendChild(btn);
}

function hideMapBtn() {
    var existing = document.querySelector('.hotel-map-btn');
    if (existing) existing.remove();
}

function openHotelMap(name) {
    var query = encodeURIComponent(name + ' Cancun Mexico');
    window.open('https://www.google.com/maps/search/?api=1&query=' + query, '_blank');
}

function addAdminPricingRow() {
    var container = document.getElementById('admin-pricing-container');
    if (!container) return;

    var row = document.createElement('div');
    row.className = 'admin-dynamic-row pricing-row';
    row.innerHTML = '<input type="number" placeholder="Adults (e.g. 1)" class="p-adults" required><input type="number" placeholder="Price (e.g. 150)" class="p-price" required><button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">X</button>';
    container.appendChild(row);
}

function addAdminItineraryRow() {
    var container = document.getElementById('admin-itinerary-container');
    if (!container) return;

    var row = document.createElement('div');
    row.className = 'admin-dynamic-row itinerary-row';
    row.innerHTML = '<input type="text" placeholder="EN Step" class="i-en" required><input type="text" placeholder="ES Step" class="i-es" required><button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">X</button>';
    container.appendChild(row);
}

function addAdminInclRow(type) {
    var container = document.getElementById('admin-' + type + '-container');
    if (!container) return;

    var row = document.createElement('div');
    row.className = 'admin-dynamic-row ' + type + '-row';
    row.innerHTML = '<input type="text" placeholder="EN" class="inc-en" required><input type="text" placeholder="ES" class="inc-es" required><button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">X</button>';
    container.appendChild(row);
}

function filesAreJpg(fileList) {
    return Array.from(fileList || []).every(function (file) {
        if (!file) return true;
        var mime = String(file.type || '').toLowerCase();
        return mime === 'image/jpeg' || mime === 'image/jpg' || /\.jpe?g$/i.test(file.name || '');
    });
}

async function handleAdminAddTour(e) {
    e.preventDefault();

    var submitBtn = document.getElementById('admin-submit-tour-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        if (!isAdminLoggedIn()) {
            throw new Error(t('adminAuthRequired'));
        }

        var rawSlug = document.getElementById('admin-tour-slug').value.trim();
        var slug = sanitizeSlugClient(rawSlug);
        if (!slug) throw new Error(t('invalidSlug'));

        var heroFile = document.getElementById('admin-img-hero').files[0];
        var cardFile = document.getElementById('admin-img-card').files[0];
        var galleryFiles = document.getElementById('admin-img-gallery').files;

        if (!filesAreJpg([heroFile, cardFile]) || !filesAreJpg(galleryFiles)) {
            throw new Error(t('onlyJpgError'));
        }

        var data = {
            slug: slug,
            price_from: safeInt(document.getElementById('admin-tour-price-from').value, 0),
            child_price_flat: safeInt(document.getElementById('admin-tour-child-price').value, 0),
            title_en: document.getElementById('admin-tour-title-en').value,
            title_es: document.getElementById('admin-tour-title-es').value,
            subtitle_en: document.getElementById('admin-tour-subtitle-en').value,
            subtitle_es: document.getElementById('admin-tour-subtitle-es').value,
            short_desc_en: document.getElementById('admin-tour-short-en').value,
            short_desc_es: document.getElementById('admin-tour-short-es').value,
            description_en: document.getElementById('admin-tour-desc-en').value,
            description_es: document.getElementById('admin-tour-desc-es').value,
            card_thumbnail: 2,
            hero_image: 1,
            pricing_tiers: [],
            itinerary: [],
            includes: [],
            excludes: [],
            gallery_images: []
        };

        document.querySelectorAll('.pricing-row').forEach(function (row) {
            data.pricing_tiers.push({
                adults: safeInt(row.querySelector('.p-adults').value, 0),
                adult_price: safeInt(row.querySelector('.p-price').value, 0)
            });
        });

        document.querySelectorAll('.itinerary-row').forEach(function (row) {
            data.itinerary.push({
                en: row.querySelector('.i-en').value,
                es: row.querySelector('.i-es').value
            });
        });

        document.querySelectorAll('.includes-row').forEach(function (row) {
            data.includes.push({
                en: row.querySelector('.inc-en').value,
                es: row.querySelector('.inc-es').value
            });
        });

        document.querySelectorAll('.excludes-row').forEach(function (row) {
            data.excludes.push({
                en: row.querySelector('.inc-en').value,
                es: row.querySelector('.inc-es').value
            });
        });

        var formData = new FormData();
        formData.append('slug', slug);

        if (heroFile) formData.append('images', heroFile, '1.jpg');
        if (cardFile) formData.append('images', cardFile, '2.jpg');

        for (var i = 0; i < galleryFiles.length; i += 1) {
            var num = i + 3;
            data.gallery_images.push(num);
            formData.append('images', galleryFiles[i], num + '.jpg');
        }

        formData.append('data', JSON.stringify(data));

        var response = await adminFetch('/api/tours', {
            method: 'POST',
            body: formData
        });

        var result = await response.json();
        if (!response.ok || result.status !== 'ok') {
            throw new Error(result.error || t('saveError'));
        }

        showToast('success', state.language === 'es' ? 'Éxito' : 'Success', t('tourSaved'));

        document.getElementById('admin-add-tour-form').reset();
        document.getElementById('admin-itinerary-container').innerHTML = '';
        document.getElementById('admin-pricing-container').innerHTML = '';
        document.getElementById('admin-includes-container').innerHTML = '';
        document.getElementById('admin-excludes-container').innerHTML = '';

        try {
            var refreshed = await fetch('/api/tours').then(function (r) { return r.json(); });
            TOURS = {};
            refreshed.forEach(function (tour) {
                TOURS[tour.id] = tour;
            });
            if (state.currentView === 'catalog') renderCatalog();
        } catch (_) {
            // Ignore refresh issues after successful save.
        }
    } catch (err) {
        console.error(err);
        showToast('error', state.language === 'es' ? 'Error' : 'Error', err.message || t('saveError'));
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}
