import https from 'https';

interface Certificate {
  issuer: any;
  valid_from: string;
  valid_to: string;
  subject: any;
  cert: string;
}

interface Certificates {
  domain: string;
  peerCertificate: Certificate;
  intermediateCertificates: Certificate[];
}

export async function main(event: any) {
  const domain = event.domain;

  if (!domain) {
    return {
      statusCode: 400,
      body: { error: 'Domain is required' },
    };
  }

  if (!isValidDomain(domain)) {
    return {
      statusCode: 400,
      body: { error: 'Invalid domain format' },
    };
  }

  try {
    console.log(`Getting certificates for domain: ${domain}`);

    const certs = await getCertificatesForDomain(domain);
    return {
      statusCode: 200,
      body: certs,
    };
  } catch (error: any) {
    console.error(`Error retrieving certificates for ${domain}: ${error.message}`);
    return {
      statusCode: 500,
      body: { error: `Failed to retrieve certificates: ${error.message}` },
    };
  }
}

// Utility function to validate domain names
function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.(?!-)([A-Za-z0-9-]{1,63}\.(?<!-))*[A-Za-z]{2,6}$/;
  return domainRegex.test(domain);
}

// Utility function to get certificates for a domain
function getCertificatesForDomain(domain: string): Promise<Certificates> {
  const options = {
    host: domain,
    port: 443,
    agent: false,
    rejectUnauthorized: false,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res:any) => {
      const certificate = res.socket.getPeerCertificate(true);

      if (!certificate) {
        return reject(new Error('No certificate found'));
      }

      const peerCertificate = formatCertificate(certificate);
      const intermediateCertificates: Certificate[] = [];

      let currentCert = certificate;
      while (currentCert && currentCert.issuerCertificate) {
        if (currentCert === currentCert.issuerCertificate) break;
        intermediateCertificates.push(formatCertificate(currentCert.issuerCertificate));
        currentCert = currentCert.issuerCertificate;
      }

      resolve({
        domain,
        peerCertificate,
        intermediateCertificates,
      });
    });

    req.on('error', (error:any) => {
      reject(error);
    });

    req.end();
  });
}

function formatCertificate(cert: any): Certificate {
  return {
    issuer: cert.issuer,
    valid_from: new Date(cert.valid_from).toISOString(),
    valid_to: new Date(cert.valid_to).toISOString(),
    subject: cert.subject,
    cert: cert.raw.toString('base64'),
  };
}
