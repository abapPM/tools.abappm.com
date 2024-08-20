![Version](https://img.shields.io/github/v/release/abapPM/tools-abappm-com?label=Version&color=blue)

[![License](https://img.shields.io/github/license/abapPM/tools-abappm-com?label=License&color=green)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg?color=green)](https://github.com/abapPM/.github/blob/main/CODE_OF_CONDUCT.md)
[![REUSE Status](https://api.reuse.software/badge/github.com/abapPM/tools-abappm-com)](https://api.reuse.software/info/github.com/abapPM/tools-abappm-com)

# apm Services

A collection of web services for [apm](https://abappm.com) and other ABAP packages.

The services are implemented as serverless functions and intended for easy consumption in ABAP.

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%202.svg)](https://www.digitalocean.com/?refcode=ec229ff11f84&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)

Note: This is a free service with limited performance and scalability.

## Web Interface

Go to https://tools.abappm.com and you can use the services via an HTML interface.

## API

### Certificate Fetcher

Easy way to retrieve the SSL certificates required to connect to a domain via SSL.

#### Request

Pass the domain name as a parameter to the following URL:

```
curl -X GET https://tools.abappm.com/api/v1/certificates?domain=example.com
```

#### Response

The result of the call includes the certificate of the domain server as well as the root and any intermediate certificates.

[Example](https://raw.githubusercontent.com/abapPM/tools.abappm.com/main/certificates_response.json) (abbreviated certificate data):

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
    "validFrom": "2024-03-07T00:00:00.000Z",
    "validTo": "2025-03-07T23:59:59.000Z",
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
      "validFrom": "2018-11-02T00:00:00.000Z",
      "validTo": "2030-12-31T23:59:59.000Z",
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
      "validFrom": "2019-03-12T00:00:00.000Z",
      "validTo": "2028-12-31T23:59:59.000Z",
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
      "validFrom": "2004-01-01T00:00:00.000Z",
      "validTo": "2028-12-31T23:59:59.000Z",
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

## Contributions

All contributions are welcome! Read our [Contribution Guidelines](CONTRIBUTING.md), fork this repo, and create a pull request.

## About

Made with :heart: in Canada

Copyright 2024 apm.to Inc. <https://apm.to>

Follow [@marcfbe](https://twitter.com/marcfbe) on X/Twitter
