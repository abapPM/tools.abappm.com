const express = require('express');
const https = require('https');
const pem = require('pem');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  const domain = req.query.domain;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  getCertificatesForDomain(domain, (error, certs) => {
    if (error) {
      return res.status(500).json({ error: `Failed to retrieve certificates: ${error.message}` });
    }
    res.json(certs);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Utility function to validate domain names
function isValidDomain(domain) {
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.(?!-)([A-Za-z0-9-]{1,63}\.(?<!-))*[A-Za-z]{2,6}$/;
  return domainRegex.test(domain);
}

// Utility function to get certificates for a domain
function getCertificatesForDomain(domain, callback) {
  const options = {
    host: domain,
    port: 443,
    agent: false,
    rejectUnauthorized: false,
  };

  console.log(`--- Getting certificates for ${domain}`);

  const req = https.request(options, (res) => {
    const certificate = res.socket.getPeerCertificate(true);

    if (!certificate) {
      return callback(new Error('No certificate found'));
    }

    // Create the certificate chain, including the leaf, intermediates, and root certificates
    const certs = {
      domain: domain,
      peerCertificate: formatCertificate(certificate),
      intermediateCertificates: [],
    };

    let currentCert = certificate;
    while (currentCert && currentCert.issuerCertificate) {
      if (currentCert === currentCert.issuerCertificate) break;
      certs.intermediateCertificates.push(formatCertificate(currentCert.issuerCertificate));
      currentCert = currentCert.issuerCertificate;
    }

    callback(null, certs);
  });

  req.on('error', (error) => {
    callback(error);
  });

  req.end();
}

function formatCertificate(cert) {
  return {
    issuer: cert.issuer,
    valid_from: new Date(cert.valid_from).toISOString(),
    valid_to: new Date(cert.valid_to).toISOString(),
    subject: cert.subject,
    cert: cert.raw.toString('base64')
  };
}
