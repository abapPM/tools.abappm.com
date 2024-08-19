# certs.abappm.com

A web application to fetch SSL certificates for a domain

## Instructions

Install the required dependencies by running:

```bash
npm install
```

Start the server by running:

```bash
npm start
```

You can fetch the certificates for a specific domain in JSON format by sending a GET request to:

```
http://your-server:3000/?domain=example.com
```

Example (abbreviated certificate data):

```json
{
  "domain": "github.com",
  "peerCertificate": {
    "issuer": {
      "C": "GB",
      "ST": "Greater Manchester",
      "L": "Salford",
      "O": "Sectigo Limited",
      "CN": "Sectigo ECC Domain Validation Secure Server CA"
    },
    "valid_from": "2024-03-07T00:00:00.000Z",
    "valid_to": "2025-03-07T23:59:59.000Z",
    "subject": { "CN": "github.com" },
    "cert": "MIIEozCC...siesA"
  },
  "intermediateCertificates": [
    {
      "issuer": {
        "C": "US",
        "ST": "New Jersey",
        "L": "Jersey City",
        "O": "The USERTRUST Network",
        "CN": "USERTrust ECC Certification Authority"
      },
      "valid_from": "2018-11-02T00:00:00.000Z",
      "valid_to": "2030-12-31T23:59:59.000Z",
      "subject": {
        "C": "GB",
        "ST": "Greater Manchester",
        "L": "Salford",
        "O": "Sectigo Limited",
        "CN": "Sectigo ECC Domain Validation Secure Server CA"
      },
      "cert": "MIIDqDCCA...QcKmc8fmA=="
    },
    {
      "issuer": {
        "C": "GB",
        "ST": "Greater Manchester",
        "L": "Salford",
        "O": "Comodo CA Limited",
        "CN": "AAA Certificate Services"
      },
      "valid_from": "2019-03-12T00:00:00.000Z",
      "valid_to": "2028-12-31T23:59:59.000Z",
      "subject": {
        "C": "US",
        "ST": "New Jersey",
        "L": "Jersey City",
        "O": "The USERTRUST Network",
        "CN": "USERTrust ECC Certification Authority"
      },
      "cert": "MIID0zCCA...oEeJBuv/c="
    },
    {
      "issuer": {
        "C": "GB",
        "ST": "Greater Manchester",
        "L": "Salford",
        "O": "Comodo CA Limited",
        "CN": "AAA Certificate Services"
      },
      "valid_from": "2004-01-01T00:00:00.000Z",
      "valid_to": "2028-12-31T23:59:59.000Z",
      "subject": {
        "C": "GB",
        "ST": "Greater Manchester",
        "L": "Salford",
        "O": "Comodo CA Limited",
        "CN": "AAA Certificate Services"
      },
      "cert": "MIIEMjCCAxqgAw...pNpaYbg=="
    }
  ]
}
```
