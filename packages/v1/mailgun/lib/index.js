"use strict";
// Mailgun email sending endpoint for DigitalOcean Functions
// This endpoint should be deployed as a DigitalOcean serverless function
// Environment variables needed:
// - MAILGUN_API_KEY: Your Mailgun API key
// - MAILGUN_DOMAIN: Your Mailgun domain (e.g., mail.abappm.com)
// - TO_EMAIL: Email address to receive contact form submissions (e.g., hello@abappm.com)
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const tslib_1 = require("tslib");
const sanitize_html_1 = tslib_1.__importDefault(require("sanitize-html"));
async function main(event, context) {
    var _a, _b, _c, _d;
    console.log('environment', process.env);
    return {
        statusCode: 200,
        body: { environment: process.env }
    };
    try {
        // Check if request is from allowed domains
        const headers = ((_a = event.http) === null || _a === void 0 ? void 0 : _a.headers) || {};
        const origin = headers.origin;
        const allowedDomains = [
            /^https?:\/\/.*\.abappm\.com$/,
            /^https?:\/\/.*\.apm\.to$/
        ];
        const isAllowedOrigin = origin && allowedDomains.some(domain => domain.test(origin));
        if (!isAllowedOrigin) {
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: { error: 'Forbidden: Origin not allowed' }
            };
        }
        // Handle CORS preflight requests
        const httpMethod = ((_c = (_b = event.http) === null || _b === void 0 ? void 0 : _b.method) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || 'POST';
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: ''
            };
        }
        // Only allow POST requests
        if (httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: {
                    'Access-Control-Allow-Origin': origin
                },
                body: { error: 'Method not allowed' }
            };
        }
        // Handle both string and object body formats
        const rawBody = (_d = event.http) === null || _d === void 0 ? void 0 : _d.body;
        const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        const formData = body || {};
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': origin
                },
                body: { error: 'Missing required fields' }
            };
        }
        // Get Mailgun credentials from environment variables
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        const toEmail = process.env.TO_EMAIL || 'hello@abappm.com';
        if (!apiKey || !domain) {
            console.error('Mailgun credentials not configured');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': origin
                },
                body: { error: 'Email service not configured' }
            };
        }
        // Prepare email content
        const subject = formData.subject || 'Contact Form Submission';
        const fullName = `${formData.firstName} ${formData.lastName}`;
        const sanitize = (str) => (0, sanitize_html_1.default)(str, { allowedTags: [], allowedAttributes: {} });
        const sanitizedFullName = sanitize(fullName);
        const sanitizedEmail = sanitize(formData.email);
        const sanitizedCompany = sanitize(formData.company || 'Not provided');
        const sanitizedSubject = sanitize(subject);
        const sanitizedMessage = sanitize(formData.message);
        const emailBody = `
New contact form submission from apm.to

Name: ${sanitizedFullName}
Email: ${sanitizedEmail}
Company: ${sanitizedCompany}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}
        `.trim();
        return {
            statusCode: 200,
            body: { emailBody }
        };
        //   // Send email via Mailgun API
        //   const mailgun = new Mailgun(FormData);
        //   const mg = mailgun.client({
        //     username: "api",
        //     key: apiKey || '',
        //     url: "https://api.eu.mailgun.net"
        //   });
        //   const result = await mg.messages.create(domain || '', {
        //     from: 'Mailgun Sandbox <postmaster@mail.abappm.com>',
        //     to: [toEmail],
        //     replyTo: `${sanitizedFullName} <${sanitizedEmail}>`,
        //     subject: `Contact Form: ${sanitizedSubject}`,
        //     text: emailBody
        //   });
        //   return {
        //     statusCode: 200,
        //     headers: {
        //       'Content-Type': 'application/json',
        //       'Access-Control-Allow-Origin': origin,
        //       'Access-Control-Allow-Methods': 'POST, OPTIONS',
        //       'Access-Control-Allow-Headers': 'Content-Type'
        //     },
        //     body: {
        //       success: true,
        //       message: 'Email sent successfully',
        //       id: result.id
        //     }
        //   };
    }
    catch (error) {
        console.error('Error processing request:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': origin
            },
            body: { error: 'Internal server error' }
        };
    }
}
;
