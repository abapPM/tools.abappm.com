import https from 'node:https';

interface Certificate {
  issuer: any;
  validFrom: string;
  validTo: string;
  subject: any;
  cert: string;
  pem: string;
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
    console.log(`Error retrieving certificates for ${domain}: ${error.message}`);
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
export function getCertificatesForDomain(domain: string): Promise<Certificates> {
  const options = {
    host: domain,
    port: 443,
    agent: false,
    rejectUnauthorized: false,
    timeout: 10000,
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
  const base64Cert = cert.raw.toString('base64');
  const pemCert = `-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`;

  return {
    issuer: cert.issuer,
    validFrom: new Date(cert.valid_from).toISOString(),
    validTo: new Date(cert.valid_to).toISOString(),
    subject: cert.subject,
    cert: base64Cert,
    pem: pemCert
  };
}
