const https = require('https');

module.exports = async (req, res) => {
  const domain = req.query.domain;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  try {
    console.log(`Getting certificates for domain: ${domain}`);

    const certs = await getCertificatesForDomain(domain);
    res.status(200).json(certs);
  } catch (error) {
    console.error(`Error retrieving certificates for ${domain}: ${error.message}`);
    res.status(500).json({ error: `Failed to retrieve certificates: ${error.message}` });
  }
};

// Utility function to validate domain names
function isValidDomain(domain) {
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.(?!-)([A-Za-z0-9-]{1,63}\.(?<!-))*[A-Za-z]{2,6}$/;
  return domainRegex.test(domain);
}

// Utility function to get certificates for a domain
function getCertificatesForDomain(domain) {
  const options = {
    host: domain,
    port: 443,
    agent: false,
    rejectUnauthorized: false,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const certificate = res.socket.getPeerCertificate(true);

      if (!certificate) {
        return reject(new Error('No certificate found'));
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

      resolve(certs);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function formatCertificate(cert) {
  return {
    issuer: cert.issuer,
    valid_from: new Date(cert.valid_from).toISOString(),
    valid_to: new Date(cert.valid_to).toISOString(),
    subject: cert.subject,
    cert: cert.raw.toString('base64'),
  };
}
