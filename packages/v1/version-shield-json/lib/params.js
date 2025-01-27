const {
    enumify,
} = require('./utils');
const { APACK_FILENAME } = require('./apack');

function unescape(str) {
    return str.replace(/%23/g, '#'); // namespace delimiter
}

// Source path format: 
// /$TYPE/$OWNER/$REPO/$PATH/$CONSTANT_NAME
// or
// /$TYPE/$OWNER/$REPO/$PATH/.apack-manifest.xml

// TODO: $TYPE/$OWNER/$REPO/[-$BRANCH/]$PATH[/$CONSTANT_NAME]

function parsePathParams({pathParameters}) {
    if (!pathParameters) throw Error('Unexpected path');
    if (!pathParameters.sourcePath) throw Error('Unexpected source path');
    const segments = pathParameters.sourcePath.split('/').filter(s => s !== '');
    if (segments.length === 0) throw Error('Unexpected path');
    if (segments.length > 20) throw Error('Too many path segments');

    const STATES = enumify(['TYPE', 'OWNER', 'REPO', 'BRANCH', 'FILE', 'ATTR', 'END']);
    let expected = STATES.TYPE;
    let params = {};
    for (const seg of segments) {
        const appendSeg = (param) => param ? (param + '/' + seg) : seg;
        switch (expected) {
        case STATES.TYPE:
            params.type = seg;
            expected++;
            break;
        case STATES.OWNER:
            params.owner = seg;
            expected++;
            break;
        case STATES.REPO:
            params.repo = seg;
            expected++;
            break;
        case STATES.BRANCH:
            if (seg[0] === '-') {
                params.branch = seg.slice(1);
            } else {
                params.file = appendSeg(params.file);
                if (/\.abap$/i.test(seg) || seg === APACK_FILENAME) expected++;
            }
            expected++;
            break;
        case STATES.FILE:
            params.file = appendSeg(params.file);
            if (/\.abap$/i.test(seg) || seg === APACK_FILENAME) expected++;
            break;
        case STATES.ATTR:
            if (params.file === APACK_FILENAME) {
                if (!params.apackExtra) params.apackExtra = seg;
                else params.apackExtraParam = appendSeg(params.apackExtraParam);
            } else {
                params.attr = seg;
                expected++;
            }
            break;
        case STATES.END:
            throw Error('Unexpect path segment');
        default:
            throw Error('Unexpected parsing state');
        }
    }
    return params;
}

function applyDefaults(params) {
    const final = {...params};
    if (!final.attr && final.file !== APACK_FILENAME) final.attr = 'version';
    if (!final.branch) final.branch = 'master';
    return final;
}

function validateQueryParams(params) {
    if (!params.type) throw Error('Repository type not specified'); // 400 bad request
    if (!params.owner) throw Error('Owner not specified');
    if (!params.repo) throw Error('Repository name not specified');
    if (!params.file) throw Error('Source file not specified');

    const supportedTypes = ['github','gitlab','bitbucket'];
    if (!supportedTypes.includes(params.type)) throw Error('Repository type not supported');

    if ((params.apackExtra || params.apackExtraParam) && params.file !== APACK_FILENAME) throw Error('Apack params consistency failed');

    const supportedApackExtraActions = ['dependencies'];
    if (params.apackExtra && !supportedApackExtraActions.includes(params.apackExtra)) throw Error('Wrong apack extra action');

    const allAttrs = ['type', 'owner', 'repo', 'branch','file', 'attr', 'apackExtra', 'apackExtraParam'];
    const allowedSymbols = /^[-_.,0-9a-zA-Z/]+$/;
    const allowedFilenameSymbols = /^[-_.,0-9a-zA-Z/#]+$/;
    for (const attr of allAttrs) {
        if (!Object.prototype.hasOwnProperty.call(params, attr)) continue;
        const validationSet = (attr === 'file')
            ? allowedFilenameSymbols
            : allowedSymbols;
        const attrValue = (attr === 'file')
            ? unescape(params[attr])
            : params[attr];
        if (!validationSet.test(attrValue)) throw Error(`[${attr}] has disallowed symbols`);
    }

    if (params.apackExtra === 'dependencies' && !params.apackExtraParam) throw Error('dependencies action expect params');

    return applyDefaults(Object.fromEntries(
        Object.entries(params).filter(([key]) => allAttrs.includes(key))
    ));
}

module.exports = {
    parsePathParams,
    validateQueryParams,
};
