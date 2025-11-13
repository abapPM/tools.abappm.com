"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
async function main(event, context) {
    return {
        statusCode: 200,
        body: JSON.stringify({ event, context })
    };
}
;
