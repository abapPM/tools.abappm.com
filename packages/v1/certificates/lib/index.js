"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.getCertificatesForDomain = getCertificatesForDomain;
const tslib_1 = require("tslib");
const node_https_1 = tslib_1.__importDefault(require("node:https"));
async function main(event) {
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
    }
    catch (error) {
        console.log(`Error retrieving certificates for ${domain}: ${error.message}`);
        return {
            statusCode: 500,
            body: { error: `Failed to retrieve certificates: ${error.message}` },
        };
    }
}
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
        timeout: 10000,
    };
    return new Promise((resolve, reject) => {
        const req = node_https_1.default.request(options, (res) => {
            const certificate = res.socket.getPeerCertificate(true);
            if (!certificate) {
                return reject(new Error('No certificate found'));
            }
            const peerCertificate = formatCertificate(certificate);
            const intermediateCertificates = [];
            let currentCert = certificate;
            while (currentCert && currentCert.issuerCertificate) {
                if (currentCert === currentCert.issuerCertificate)
                    break;
                intermediateCertificates.push(formatCertificate(currentCert.issuerCertificate));
                currentCert = currentCert.issuerCertificate;
            }
            resolve({
                domain,
                peerCertificate,
                intermediateCertificates,
            });
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
        validFrom: new Date(cert.valid_from).toISOString(),
        validTo: new Date(cert.valid_to).toISOString(),
        subject: cert.subject,
        cert: cert.raw.toString('base64'),
    };
}
