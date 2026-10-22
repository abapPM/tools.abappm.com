'use strict';

const https = require('https');

const MAX_RESOURCE_BYTES = 1024 * 1024;
// Leave time to parse and respond before the function's 1000 ms platform limit.
const RESOURCE_TIMEOUT_MS = 750;

function fetchResource(url) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let bytes = 0;
        let settled = false;
        let request;
        let response;
        // An absolute deadline also covers DNS, connection setup and slow trickles.
        const deadline = setTimeout(() => fail(Error('Fetching file timed out')), RESOURCE_TIMEOUT_MS);

        function fail(error) {
            if (settled) return;
            settled = true;
            clearTimeout(deadline);
            chunks.length = 0;
            reject(error);
            if (response) response.destroy();
            if (request) request.destroy();
        }

        try {
            request = https.get(url, res => {
                response = res;
                res.on('error', fail);
                if (settled) {
                    res.destroy();
                    return;
                }
                console.log(`fetch statusCode: ${res.statusCode}`);
                if (!(res.statusCode >= 200 && res.statusCode < 300)) {
                    const detail = res.statusCode === 404 ? ' repository might be private' : '';
                    fail(Error(`Fetching file failed: [${res.statusCode}]${detail}`));
                    return;
                }
                if (Number(res.headers['content-length']) > MAX_RESOURCE_BYTES) {
                    fail(Error('Fetching file failed: response exceeds 1 MiB limit'));
                    return;
                }
                res.on('data', data => {
                    if (settled) return;
                    bytes += data.length;
                    if (bytes > MAX_RESOURCE_BYTES) {
                        fail(Error('Fetching file failed: response exceeds 1 MiB limit'));
                        return;
                    }
                    chunks.push(data);
                });
                res.on('end', () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(deadline);
                    resolve(Buffer.concat(chunks, bytes).toString());
                    chunks.length = 0;
                });
                res.on('aborted', () => fail(Error('Fetching file failed: response aborted')));
                res.on('close', () => {
                    if (!settled) fail(Error('Fetching file failed: response closed before completion'));
                });
            });
            request.on('error', fail);
            // Also support a response callback that fails before https.get returns.
            if (settled) request.destroy();
        } catch (error) {
            fail(error);
        }
    });
}

const enumify = list => Object.freeze(list.reduce((prev, i, index) => Object.assign(prev, { [i]: index }), {}));

function buildResponse(body, code = 200) {
    const response = {
        statusCode: code,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };
    return response;
}

function xmlGetChildrenOf(xml, path) {
    const segments = path.split('/').filter(i => !!i);
    if (segments.length === 0) throw Error('Unexpected xml drilldown path');
    for (const seg of segments) {
        if (typeof xml !== 'object') throw Error('XML path not found');
        xml = xml[seg];
    }
    return xml;
}

module.exports = {
    xmlGetChildrenOf,
    enumify,
    fetchResource,
    buildResponse,
};
