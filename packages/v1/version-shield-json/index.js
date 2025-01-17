"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;

const handler = require('./handler');

async function main(event) {
    const http_path = event.http.path.replace(/^\//, '');
    const shield_event = {
        resource: '/version-shield-json/{sourcePath}',
        path: '/version-shield-json/' && http_path,
        pathParameters: {
            sourcePath: http_path
        },
    };
    const shield_context = {};

    let result = await handler.getShieldJson(shield_event, shield_context);
    if (result instanceof Promise) result = await result;
    return result;
}
