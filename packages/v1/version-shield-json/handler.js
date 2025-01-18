'use strict';

const {
    fetchResource,
    buildResponse,
} = require('./lib/utils');

const {
    parsePathParams,
    validateQueryParams,
} = require('./lib/params');

const {
    validateVersion,
    parseSourceFile,
} = require('./lib/parse');

const {
    APACK_FILENAME,
    getVersionFromApack,
    getDependencyVersionFromApack,
} = require('./lib/apack');

module.exports.getShieldJson = async (event, context) => {
    try {
        return await handleEvent(event, context);
    } catch (error) {
        console.error(error);
        return buildErrorResponce(String(error), 400);
    }
};

module.exports.errorStub = async () => {
    console.error('Unexpected call');
    return buildErrorResponce('Unexpected call', 400);
};


// eslint-disable-next-line no-unused-vars
async function handleEvent(event, context) {
    console.log('Requested path:', event.path);

    const params = parsePathParams(event);
    const validatedParams = validateQueryParams(params);
    const url = createUrlFromParams('master', validatedParams); // TODO: get branch from params
    const srcData = await fetchResource(url);
    let version = (validatedParams.file === APACK_FILENAME)
        ? validatedParams.apackExtra === 'dependencies'
            ? getDependencyVersionFromApack(srcData, validatedParams.apackExtraParam)
            : getVersionFromApack(srcData)
        : parseSourceFile(srcData, validatedParams.attr);

    validateVersion(version);
    if (/\d/.test(version[0])) version = 'v' + version;
    const response = buildSuccessResponse(version);
    return response;
}

// GitHub: https://raw.githubusercontent.com/abapGit/abapGit/refs/heads/main/src/zif_abapgit_version.intf.abap
// GitLab: https://gitlab.com/fernandofurtado/abap-markdown/-/raw/master/src/zmarkdown.clas.abap
// Bitbucket: https://bitbucket.org/marcfbe/abapgit/raw/main/src/zif_test.intf.abap

function createUrlFromParams(branch, {type, owner, repo, file}) {
    const url = ``;
    if (type === 'github') {
        url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`;
    } else if (type === 'gitlab') {
        url = `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${file}`;
    } else if (type === 'bitbucket') {
        url = `https://bitbucket.org/${owner}/${repo}/raw/${branch}/${file}`;
    } else {
        throw Error('Unexpected url type');
    }
    console.log('URL:', url);
    return url;
}

function buildSuccessResponse(version) {
    const SHIELD_LABEL = 'abap package version';
    return buildResponse({
        message: version,
        schemaVersion: 1,
        label: SHIELD_LABEL,
        color: 'orange',
    });
}

function buildErrorResponce(message, code = 400) {
    return buildResponse({ message }, code);
}
