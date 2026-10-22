import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const https = require('https');
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');
const { fetchResource } = require('./utils');
const LIMIT = 1024 * 1024;

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

function startDownload(statusCode = 200, headers = {}) {
    const request = new EventEmitter();
    request.destroy = vi.fn();
    const response = new PassThrough();
    response.statusCode = statusCode;
    response.headers = headers;
    let onResponse;
    vi.spyOn(https, 'get').mockImplementation((url, callback) => {
        onResponse = callback;
        return request;
    });
    const promise = fetchResource('https://raw.githubusercontent.com/owner/repo/main/file');
    return { request, response, promise, respond: () => onResponse(response) };
}

describe('bounded repository downloads', () => {
    test('accepts exactly 1 MiB and clears the deadline', async () => {
        const { promise, response, respond, request } = startDownload(200, { 'content-length': String(LIMIT) });
        respond();
        response.end(Buffer.alloc(LIMIT, 'a'));
        expect((await promise).length).toBe(LIMIT);
        expect(request.destroy).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    test('concatenates many small chunks once and decodes split UTF-8 characters', async () => {
        const { promise, response, respond } = startDownload();
        respond();
        const concat = vi.spyOn(Buffer, 'concat');
        for (let i = 0; i < 1000; i++) response.write(Buffer.from('x'));
        response.write(Buffer.from([0xe2]));
        response.write(Buffer.from([0x82, 0xac]));
        response.end();
        expect(await promise).toBe('x'.repeat(1000) + '€');
        expect(concat).toHaveBeenCalledTimes(1);
    });

    test('rejects excessive Content-Length before reading a body', async () => {
        const { promise, response, respond, request } = startDownload(200, { 'content-length': String(LIMIT + 1) });
        const rejection = expect(promise).rejects.toThrow('response exceeds 1 MiB limit');
        respond();
        await rejection;
        expect(response.listenerCount('data')).toBe(0);
        expect(response.destroyed).toBe(true);
        expect(request.destroy).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    test.each([{}, { 'content-length': '1' }])('enforces streamed bytes regardless of headers: %j', async headers => {
        const { promise, response, respond, request } = startDownload(200, headers);
        const rejection = expect(promise).rejects.toThrow('response exceeds 1 MiB limit');
        respond();
        response.write(Buffer.alloc(LIMIT));
        response.write(Buffer.from('x'));
        await rejection;
        expect(response.destroyed).toBe(true);
        expect(request.destroy).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    test('counts multibyte input as bytes', async () => {
        const { promise, response, respond } = startDownload();
        const rejection = expect(promise).rejects.toThrow('response exceeds 1 MiB limit');
        respond();
        response.end('€'.repeat(Math.ceil(LIMIT / 3)));
        await rejection;
        expect(response.destroyed).toBe(true);
    });

    test.each([302, 404, 500])('rejects HTTP %i before buffering its body', async status => {
        const { promise, response, respond, request } = startDownload(status, { 'content-length': String(LIMIT * 100) });
        const rejection = expect(promise).rejects.toThrow(`Fetching file failed: [${status}]`);
        respond();
        await rejection;
        expect(response.listenerCount('data')).toBe(0);
        expect(response.destroyed).toBe(true);
        expect(request.destroy).toHaveBeenCalledOnce();
        expect(https.get).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    test('aborts a request that stalls before response headers', async () => {
        const { promise, request, respond, response } = startDownload();
        const rejection = expect(promise).rejects.toThrow('Fetching file timed out');
        await vi.advanceTimersByTimeAsync(749);
        expect(request.destroy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        await rejection;
        expect(request.destroy).toHaveBeenCalledOnce();
        respond();
        expect(response.destroyed).toBe(true);
        expect(response.listenerCount('data')).toBe(0);
    });

    test('aborts a slow trickle at the absolute deadline', async () => {
        const { promise, request, response, respond } = startDownload();
        const rejection = expect(promise).rejects.toThrow('Fetching file timed out');
        respond();
        for (let i = 0; i < 3; i++) {
            response.write('x');
            await vi.advanceTimersByTimeAsync(250);
        }
        await rejection;
        expect(request.destroy).toHaveBeenCalledOnce();
        expect(response.destroyed).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    test.each(['request error', 'response error', 'aborted', 'close'])('rejects %s and cleans up', async event => {
        const { promise, request, response, respond } = startDownload();
        const rejection = expect(promise).rejects.toThrow();
        respond();
        response.write('partial');
        if (event === 'request error') request.emit('error', Error('connection failed'));
        else if (event === 'response error') response.emit('error', Error('stream failed'));
        else response.emit(event);
        await rejection;
        expect(request.destroy).toHaveBeenCalledOnce();
        expect(response.destroyed).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        // Late events after failure must not restart work or throw.
        request.emit('error', Error('late error'));
        response.emit('end');
    });

    test('clears its deadline when https.get throws synchronously', async () => {
        vi.spyOn(https, 'get').mockImplementation(() => { throw Error('invalid URL') });
        await expect(fetchResource('invalid')).rejects.toThrow('invalid URL');
        expect(vi.getTimerCount()).toBe(0);
    });
});
