const API_BASE = '/api';

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}

export async function assessStyles(data) {
    return request('/assess', { method: 'POST', body: JSON.stringify(data) });
}

export async function generateDialogue(data) {
    return request('/dialogue/generate', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitReflection(data) {
    return request('/dialogue/reflect', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitRewrite(data) {
    return request('/practice/rewrite', { method: 'POST', body: JSON.stringify(data) });
}

export async function getHint(data) {
    return request('/practice/hint', { method: 'POST', body: JSON.stringify(data) });
}

export async function generateSummary(data) {
    return request('/summary', { method: 'POST', body: JSON.stringify(data) });
}
