const handler = require('./handler');

jest.mock('https');
const { PassThrough } = require('stream');
const EventEmitter = require('events');
const https = require('https');

https.get.mockImplementation((url, handler) => {
    const resMock = new PassThrough();
    resMock.statusCode = 200;
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
    } else {
        resMock.statusCode = 404;
    }
    resMock.end();

    const reqMock = new EventEmitter();
    return reqMock;
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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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

    test('should fail with wrong request', async () => {
        const event = {
            pathParameters: {
                sourcePath: 'xxx'
            },
        };
        const context = {};

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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
        expect(console.error).toBeCalled();
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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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
        expect(console.error).toBeCalled();
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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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

        global.console = {
            log: jest.fn(),
            error: jest.fn(),
        };

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
