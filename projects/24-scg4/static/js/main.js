/**
 * SCG4 - Sistema de Procesamiento de Auxiliares Contables
 * JavaScript principal
 */

// ========== Utilidades de Formato ==========

function formatNumber(num) {
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('es-MX', options);
}

// ========== Manejo de Mensajes ==========

function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// ========== Manejo de API ==========

async function apiGet(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function apiPostFile(endpoint, formData) {
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

// ========== Utilidades de Validación ==========

function isNotEmpty(value) {
    return value !== null && value !== undefined && value.trim() !== '';
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

function isTxtFile(file) {
    return file.name.toLowerCase().endsWith('.txt');
}

function isExcelFile(file) {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
}

// ========== Utilidades de UI ==========

function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

function toggleButton(buttonId, enabled) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = !enabled;
    }
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function clearElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

// ========== Utilidades de Tabla ==========

function createTableRow(data, classes = []) {
    const row = document.createElement('tr');
    data.forEach((cellData, index) => {
        const cell = document.createElement('td');
        cell.innerHTML = cellData;
        if (classes[index]) {
            cell.className = classes[index];
        }
        row.appendChild(cell);
    });
    return row;
}

function clearTableBody(tableId) {
    const table = document.getElementById(tableId);
    if (table) {
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }
    }
}

// ========== Utilidades de Descarga ==========

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function downloadExcelReport(endpoint, data, filename) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error al generar reporte');
    }
    const blob = await response.blob();
    downloadBlob(blob, filename);
}

// ========== Utilidades de Fecha ==========

function getDateNDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getFirstDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

function getFirstDayOfYear() {
    const date = new Date();
    return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
}

// ========== Event Listeners Globales ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('SCG4 - Sistema de Procesamiento de Auxiliares Contables');
    console.log('JavaScript principal cargado correctamente');
});

window.addEventListener('online', () => {
    console.log('Conexion restaurada');
});

window.addEventListener('offline', () => {
    console.warn('Sin conexion a internet');
    alert('Se ha perdido la conexion a internet. Algunas funciones pueden no estar disponibles.');
});
