// Mailgun email sending endpoint for DigitalOcean Functions
// This endpoint should be deployed as a DigitalOcean serverless function
// Environment variables needed:
// - MAILGUN_API_KEY: Your Mailgun API key
// - MAILGUN_DOMAIN: Your Mailgun domain (e.g., mail.abappm.com)
// - TO_EMAIL: Email address to receive contact form submissions (e.g., hello@abappm.com)

import FormData from "form-data";
import Mailgun from "mailgun.js";
import sanitizeHtml from 'sanitize-html';

export async function main (event: any, context: any) {
  return {
    statusCode: 200,
    body: JSON.stringify({ event, context })
  };

  // Check if request is from allowed domains
  const origin = event.headers?.origin || event.headers?.Origin;
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
  const httpMethod = event.httpMethod || event.__ow_method || 'POST';
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

  try {
    // Handle both string and object body formats
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const formData = body || event;

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

    const sanitize = (str: string) => sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });

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

    // Send email via Mailgun API
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: apiKey || '',
      url: "https://api.eu.mailgun.net"
    });

    const result = await mg.messages.create(domain || '', {
      from: 'Mailgun Sandbox <postmaster@mail.abappm.com>',
      to: [toEmail],
      replyTo: `${sanitizedFullName} <${sanitizedEmail}>`,
      subject: `Contact Form: ${sanitizedSubject}`,
      text: emailBody
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: {
        success: true,
        message: 'Email sent successfully',
        id: result.id
      }
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': origin
      },
      body: { error: 'Internal server error' }
    };
  }
};
