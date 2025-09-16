![Version](https://img.shields.io/github/v/release/abapPM/tools.abappm.com?label=Version&color=blue)

[![License](https://img.shields.io/github/license/abapPM/tools.abappm.com?label=License&color=success)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg?color=success)](https://github.com/abapPM/.github/blob/main/CODE_OF_CONDUCT.md)
[![REUSE Status](https://api.reuse.software/badge/github.com/abapPM/tools.abappm.com)](https://api.reuse.software/info/github.com/abapPM/tools.abappm.com)

# apm Services

A collection of web services for [apm](https://abappm.com) and other ABAP packages.

The services are implemented as serverless functions and intended for easy consumption in ABAP.

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%202.svg)](https://www.digitalocean.com/?refcode=ec229ff11f84&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)

Note: This is a free service with limited performance and scalability.

## Services

- [ABAP Package Version Badge](#abap-package-version-badge)
- [Certificate Fetcher](#certificate-fetcher)

## ABAP Package Version Badge

This is a service for the [shields.io](https://shields.io/badges/endpoint-badge) endpoint compatible JSON.

<a href="https://supportukrainenow.org/"><img src="https://raw.githubusercontent.com/abapPM/tools.abappm.com/refs/heads/main/web/Ukraine-heart-shape-flag.svg" height="25" alt="Support Ukraine"></a>

The service was created by [Alexander Tsybulsky](https://github.com/sbcgua) from Ukraine. Please [support Ukraine](https://war.ukraine.ua/support-ukraine/)!

You can find the original code on [GitHub](https://github.com/sbcgua/abap-package-version-shield) and the original documentation on [here](https://sbcgua.github.io/abap-package-version-shield).

### ABAP Code

The service parses ABAP code in your repository to find the value of a version constant.

Here's a typical example:

```abap
INTERFACE zif_project_version PUBLIC.
  CONSTANTS version TYPE string VALUE '3.2.1'.
ENDINTERFACE.
```

### TL;DR

<img src="https://tools.abappm.com/tldr-badge.svg" alt="abapgit version badge" />

Markdown for creating this ABAP Package Version Badge:

```
![Version](https://img.shields.io/endpoint?url=https://shield.abappm.com/github/owner/repo/src/zif_project_version.intf.abap)
```

### API Request

```
https://shield.abappm.com/$TYPE/$OWNER/$REPO/[-$BRANCH/]$PATH[/$CONSTANT_NAME]

$TYPE          = 'github', 'gitlab', or 'bitbucket' (open an issue if you need more)
$OWNER         = Your organization or user name
$REPO          = Your repository name
$BRANCH        = Branch name prefixed with '-' (optional, 'master' by default)
$PATH          = Path to ABAP file with version constant
$CONSTANT_NAME = Name of the constant that contains the version (optional, 'version' by default)

All #-symbols in the URL have to be encoded with %23.
```

Examples:

```
https://shield.abappm.com/github/abapGit/abapGit/src/zif_abapgit_version.intf.abap/c_abap_version
https://shield.abappm.com/gitlab/fernandofurtado/abap-markdown/src/zmarkdown.clas.abap
https://shield.abappm.com/bitbucket/marcfbe/abapgit/-main/src/zif_test.intf.abap/c_version
https://shield.abappm.com/github/Marc-Bernard-Tools/MBT-Listcube/src/%23mbtools%23cl_tool_bw_listcube.clas.abap
```

If your repository supports [APACK](https://docs.abapgit.org/user-guide/reference/apack.html) i.e. you have an `.apack-manifest.xml` file in your repository, you can also use the following format:

Examples:

```
https://shield.abappm.com/github/ABAP-Logger/ABAP-Logger/.apack-manifest.xml
or
https://shield.abappm.com/github/ABAP-Logger/demos/.apack-manifest.xml/dependencies/github.com/ABAP-Logger/ABAP-Logger
```

### API Response

Example:

```json
{
  "schemaVersion": 1,
  "label": "abap package version",
  "message": "1.131.0",
  "color": "orange"
}
```

### Badge Image

To get the badge image, pass the URL from above to the img.shields.io endpoint. You can also customize the badge label and color (see [shields.io](https://shields.io/endpoint-badge) for more options):

```
https://img.shields.io/endpoint?url=https://shield.abappm.com/...
or
https://img.shields.io/endpoint?url=https://shield.abappm.com/...&label=version&color=blue
```

Example:

<img src="https://tools.abappm.com/abapgit-badge.svg" alt="abapgit version badge" />

```
https://img.shields.io/endpoint?url=https://shield.abappm.com/github/abapGit/abapGit/src/zif_abapgit_version.intf.abap/c_abap_version&label=version&color=blue
or as markdown 
![Version](https://img.shields.io/endpoint?url=https://shield.abappm.com/github/abapGit/abapGit/src/zif_abapgit_version.intf.abap/c_abap_version&label=version&color=blue)
```

> [!IMPORTANT]
> If you are refering to a namespaced object, all #-symbols in the URL have to be encoded with `%2523`.
> Example: `https://img.shields.io/endpoint?url=https://shield.abappm.com/github/Marc-Bernard-Tools/MBT-Listcube/src/%2523mbtools%2523cl_tool_bw_listcube.clas.abap`
 
### Web Interface

You can test the services via an HTML interface at https://tools.abappm.com.

## Certificate Fetcher

Easy way to retrieve the SSL certificates required to connect to a domain via SSL.

### API Request

Pass the domain name as a parameter to the following URL:

```
curl -X GET https://tools.abappm.com/api/v1/certificates?domain=example.com
```

### API Response

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
    "pem": "-----BEGIN CERTIFICATE-----\nMIIEozCC... siesA==\n-----END CERTIFICATE-----\n",
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
      "pem": "-----BEGIN CERTIFICATE-----\nMIIDqDCCA... QcKmc8fmA==\n-----END CERTIFICATE-----\n",
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
      "pem": "-----BEGIN CERTIFICATE-----\nMIID0zCCA... oEeJBuv==\n-----END CERTIFICATE-----\n",
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
      "pem": "-----BEGIN CERTIFICATE-----\nMIIEMjCCAxqgAw... pNpaYbg==\n-----END CERTIFICATE-----\n",
      "cert": "MIIEMjCCAxqgAw...pNpaYbg=="
    }
  ]
}
```

### Web Interface

You can test the services via an HTML interface at https://tools.abappm.com.

## Contributions

All contributions are welcome! Read our [Contribution Guidelines](CONTRIBUTING.md), fork this repo, and create a pull request.

## Attribution

This project uses the following open source projects. Please support these great projects!

- [ABAP-Package-Version-Shield](https://github.com/sbcgua/abap-package-version-shield), Alexander Tsybulsky, [ISC](https://github.com/sbcgua/abap-package-version-shield/blob/master/package.json)

## About

Made with ❤️ in Canada

Copyright 2024 apm.to Inc. <https://apm.to>

Follow [@marcf.be](https://bsky.app/profile/marcf.be) on Bluesky and [@marcfbe](https://linkedin.com/in/marcfbe) on LinkedIn
