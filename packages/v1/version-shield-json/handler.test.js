import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const handler = require('./handler');

const { PassThrough } = require('stream');
const EventEmitter = require('events');
const https = require('https');

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(https, 'get').mockImplementation(mockGet);
});

afterEach(() => {
    vi.restoreAllMocks();
});

function mockGet(url, handler) {
    const resMock = new PassThrough();
    resMock.statusCode = 200;
    resMock.headers = {};
    handler(resMock);
    if (url === 'https://raw.githubusercontent.com/sbcgua/mockup_loader/master/src/zif_mockup_loader.intf.abap') {
        resMock.write('interface zif_mockup_loader.');
        resMock.write('  constants version type string value \'v2.1.5\'. "#EC NOTEXT');
        resMock.write('endinterface.');
    } else if (url === 'https://raw.githubusercontent.com/sbcgua/mockup_loader/master/src/zif_incorrect.intf.abap') {
        resMock.write('interface zif_mockup_loader.');
        resMock.write('  constants version type string value \'XYZ\'. "#EC NOTEXT');
        resMock.write('endinterface.');
    } else if (url === 'https://raw.githubusercontent.com/zzz/apack-test/master/.apack-manifest.xml') {
        resMock.write('<?xml version="1.0" encoding="utf-8"?>');
        resMock.write('<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">');
        resMock.write(' <asx:values>');
        resMock.write('  <DATA>');
        resMock.write('   <VERSION>0.2.0</VERSION>');
        resMock.write('   <DEPENDENCIES>');
        resMock.write('    <item>');
        resMock.write('     <GROUP_ID>sap.com</GROUP_ID>');
        resMock.write('     <ARTIFACT_ID>abap-platform-XX</ARTIFACT_ID>');
        resMock.write('     <VERSION>1.2.0</VERSION>');
        resMock.write('     <GIT_URL>https://github.com/SAP/abap-platform-xx.git</GIT_URL>');
        resMock.write('    </item>');
        resMock.write('   </DEPENDENCIES>');
        resMock.write('  </DATA>');
        resMock.write(' </asx:values>');
        resMock.write('</asx:abap>');
    } else if (url === 'https://gitlab.com/fernandofurtado/abap-markdown/-/raw/master/src/zmarkdown.clas.abap') {
        resMock.write('interface zmarkdown.');
        resMock.write('  constants VERSION type STRING value \'1.1.2\' ##NO_TEXT.');
        resMock.write('endinterface.');
    } else if (url === 'https://bitbucket.org/marcfbe/abapgit/raw/main/src/zif_test.intf.abap') {
        resMock.write('interface zif_test.');
        resMock.write('  constants version type string value \'25.11.1968-beta.1\'.');
        resMock.write('endinterface.');
    } else if (url === 'https://raw.githubusercontent.com/abapPM/abapPM-Package-Arg/master/src/%23apmg%23if_package_arg.intf.abap') {
        resMock.write('interface /apmg/if_package_arg.');
        resMock.write('  constants c_version type string value \'1.0.0\'.');
        resMock.write('endinterface.');
    } else {
        resMock.statusCode = 404;
    }
    resMock.end();

    const reqMock = new EventEmitter();
    return reqMock;
}

describe('bounded downloads through every provider and parser', () => {
    const apack = `<asx:abap>
<asx:values>
<DATA>
<VERSION>1.2.3</VERSION>
<DEPENDENCIES>
<item>
<GROUP_ID>example.com</GROUP_ID>
<ARTIFACT_ID>dependency</ARTIFACT_ID>
<VERSION>1.2.3</VERSION>
</item>
</DEPENDENCIES>
</DATA>
</asx:values>
</asx:abap>
`;
    const cases = ['github', 'gitlab', 'bitbucket'].flatMap(provider => [
        [provider, 'src/zif_version.intf.abap/version', "constants version type string value '1.2.3'."],
        [provider, '.apack-manifest.xml', apack],
        [provider, '.apack-manifest.xml/dependencies/example.com/dependency', apack],
    ]);

    function download(body) {
        const response = new PassThrough();
        response.statusCode = 200;
        response.headers = {};
        const request = new EventEmitter();
        request.destroy = vi.fn();
        https.get.mockImplementationOnce((url, callback) => {
            queueMicrotask(() => {
                callback(response);
                response.end(body);
            });
            return request;
        });
        return { request, response };
    }

    test.each(cases)('accepts a bounded %s %s file', async (provider, file, body) => {
        const { request } = download(body);
        const result = await handler.getShieldJson({
            pathParameters: { sourcePath: `${provider}/owner/repo/${file}` },
        }, {});
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('v1.2.3');
        expect(request.destroy).not.toHaveBeenCalled();
    });

    test.each(cases)('rejects an oversized %s %s file before parsing', async (provider, file) => {
        const { request, response } = download(Buffer.alloc(1024 * 1024 + 1, 'x'));
        const result = await handler.getShieldJson({
            pathParameters: { sourcePath: `${provider}/owner/repo/${file}` },
        }, {});
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Error: Fetching file failed: response exceeds 1 MiB limit');
        expect(response.destroyed).toBe(true);
        expect(request.destroy).toHaveBeenCalledOnce();
    });
});

describe('test with path params', () => {
    test('should work with normal request (github)', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/github/sbcgua/mockup_loader/src/zif_mockup_loader.intf.abap/version',
            pathParameters: {
                sourcePath: 'github/sbcgua/mockup_loader/src/zif_mockup_loader.intf.abap/version'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v2.1.5',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://raw.githubusercontent.com/sbcgua/mockup_loader/master/src/zif_mockup_loader.intf.abap');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });

    test('should work with normal request (gitlab)', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/gitlab/fernandofurtado/abap-markdown/src/zmarkdown.clas.abap/version',
            pathParameters: {
                sourcePath: 'gitlab/fernandofurtado/abap-markdown/src/zmarkdown.clas.abap/version'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v1.1.2',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://gitlab.com/fernandofurtado/abap-markdown/-/raw/master/src/zmarkdown.clas.abap');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });

    test('should work with normal request (bitbucket)', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/bitbucket/marcfbe/abapgit/-main/src/zif_test.intf.abap/version',
            pathParameters: {
                sourcePath: 'bitbucket/marcfbe/abapgit/-main/src/zif_test.intf.abap/version'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v25.11.1968-beta.1',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://bitbucket.org/marcfbe/abapgit/raw/main/src/zif_test.intf.abap');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });

    test('should work with namespaced object (github)', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/github/abapPM/abapPM-Package-Arg/src/%23apmg%23if_package_arg.intf.abap/c_version',
            pathParameters: {
                sourcePath: 'github/abapPM/abapPM-Package-Arg/src/%23apmg%23if_package_arg.intf.abap/c_version'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v1.0.0',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://raw.githubusercontent.com/abapPM/abapPM-Package-Arg/master/src/%23apmg%23if_package_arg.intf.abap');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });

    test('should fail with wrong request', async () => {
        const event = {
            pathParameters: {
                sourcePath: 'xxx'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error: Owner not specified',
            }),
        });
        expect(console.error).toHaveBeenCalled();
    });

    test('should fail with wrong version format', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/github/sbcgua/mockup_loader/src/zif_incorrect.intf.abap/version',
            pathParameters: {
                sourcePath: 'github/sbcgua/mockup_loader/src/zif_incorrect.intf.abap/version'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error: Unexpected version format (not semver): XYZ',
            }),
        });
        expect(console.error).toHaveBeenCalled();
    });
});

describe('test with apack', () => {
    test('should work with apack', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/github/zzz/apack-test/.apack-manifest.xml',
            pathParameters: {
                sourcePath: 'github/zzz/apack-test/.apack-manifest.xml'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v0.2.0',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://raw.githubusercontent.com/zzz/apack-test/master/.apack-manifest.xml');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });

    test('should work with apack and dependencies', async () => {
        const event = {
            resource: '/version-shield-json/{sourcePath}',
            path: '/version-shield-json/github/zzz/apack-test/.apack-manifest.xml',
            pathParameters: {
                sourcePath: 'github/zzz/apack-test/.apack-manifest.xml/dependencies/sap.com/abap-platform-xx'
            },
        };
        const context = {};

        await expect(handler.getShieldJson(event, context)).resolves.toEqual({
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'v1.2.0',
                schemaVersion: 1,
                label: 'abap package version',
                color: 'orange',
            }),
        });

        expect(console.log).toHaveBeenNthCalledWith(1, 'Requested path:', event.path);
        expect(console.log).toHaveBeenNthCalledWith(2, 'URL:', 'https://raw.githubusercontent.com/zzz/apack-test/master/.apack-manifest.xml');
        expect(console.log).toHaveBeenNthCalledWith(3, 'fetch statusCode: 200');
    });
});
