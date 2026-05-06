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
    return new Promise((resolve, reject) => {
        // First try with certificate validation enabled (secure)
        const secureOptions = {
            host: domain,
            port: 443,
            agent: false,
            rejectUnauthorized: true,
            timeout: 10000,
        };
        const tryRequest = (options, allowInsecure = false) => {
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
                var _a;
                // If validation failed and we haven't tried insecure yet, retry without validation
                if (!allowInsecure && (error.code === 'CERT_HAS_EXPIRED' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || error.code === 'CERT_UNTRUSTED' || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('certificate')))) {
                    console.log(`Certificate validation failed for ${domain}, retrying without validation: ${error.message}`);
                    // codeql[js/disabling-certificate-validation]: Intentionally disabling validation as fallback for certificate inspection tool
                    // This allows retrieving certificates from servers with invalid certificates for inspection/debugging purposes
                    const insecureOptions = {
                        host: domain,
                        port: 443,
                        agent: false,
                        rejectUnauthorized: false, // nosemgrep: js.disabling-certificate-validation
                        timeout: 10000,
                    };
                    tryRequest(insecureOptions, true);
                }
                else {
                    reject(error);
                }
            });
            req.end();
        };
        tryRequest(secureOptions);
    });
}
function formatCertificate(cert) {
    var _a;
    const base64Cert = cert.raw.toString('base64');
    const pemCert = `-----BEGIN CERTIFICATE-----\n${(_a = base64Cert.match(/.{1,64}/g)) === null || _a === void 0 ? void 0 : _a.join('\n')}\n-----END CERTIFICATE-----\n`;
    return {
        issuer: cert.issuer,
        validFrom: new Date(cert.valid_from).toISOString(),
        validTo: new Date(cert.valid_to).toISOString(),
        subject: cert.subject,
        cert: base64Cert,
        pem: pemCert
    };
}
