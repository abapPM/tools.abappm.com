const {
    parsePathParams,
    validateQueryParams,
} = require('./params');

describe('regular Validator tests', () => {
    test('should validate correct params (github)', () => {
        const params = {
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
            attr: 'version_attr',
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual(params);
    });

    test('should validate correct params (gitlab)', () => {
        const params = {
            type: 'gitlab',
            owner: 'fernandofurtado',
            repo: 'abap-markdown',
            branch: 'master',
            file: 'src/zmarkdown.clas.abap',
            attr: 'version',
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual(params);
    });

    test('should validate correct params (bitbucket)', () => {
        const params = {
            type: 'bitbucket',
            owner: 'marcfbe',
            repo: 'abapgit',
            branch: 'master',
            file: 'src/zif_test.intf.abap',
            attr: 'c_version',
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual(params);
    });

    test('should validate correct params without version', () => {
        const params = {
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual({...params, attr: 'version'});
    });

    test('should fail on incorrect params', () => {
        expect(() => validateQueryParams({
            // type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        })).toThrow('Repository type not specified');
        expect(() => validateQueryParams({
            type: 'github',
            // owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        })).toThrow('Owner');
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua',
            // repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        })).toThrow('Repository name');
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            // file: 'src/zif.abap',
        })).toThrow('Source file');
        expect(() => validateQueryParams({
            type: 'xxx',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        })).toThrow('Repository type not supported');

    });

    test('should fail on incorrect symbols', () => {
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua?',
            repo: 'repo_name',
            branch: 'master',
            file: 'src/zif.abap',
        })).toThrow('[owner] has disallowed symbols');
    });
});


describe('Regular Parser tests', () => {
    test('should parse correct path', () => {
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/src/zif.abap/attr_name'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: 'src/zif.abap',
            attr: 'attr_name',
        });
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/src/zif.abap'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: 'src/zif.abap',
        });
    });

    test('should parse path with namespace char', () => {
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/src/%23hello%23zif.abap'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: 'src/%23hello%23zif.abap', // unchanged but validation passed
        });
    });

    test('should parse with branch', () => {
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/-next/src/zif.abap/attr_name'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'next',
            file: 'src/zif.abap',
            attr: 'attr_name',
        });
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'gitlab/sbcgua/repo_name/-test/src/zif.abap'
            },
        })).toEqual({
            type: 'gitlab',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'test',
            file: 'src/zif.abap',
        });
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'bitbucket/marcfbe/abapgit/-main/src/zif_test.intf.abap'
            },
        })).toEqual({
            type: 'bitbucket',
            owner: 'marcfbe',
            repo: 'abapgit',
            branch: 'main',
            file: 'src/zif_test.intf.abap',
        });
    });

    test('should throw on incorrect path', () => {
        expect(() => parsePathParams({
            pathParameters: {
                sourcePath: ''
            },
        })).toThrow('Unexpected source path');
        expect(() => parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/src/zif.abap/attr_name/extra'
            },
        })).toThrow('Unexpect path segment');
    });
    test('should throw on too long path', () => {
        expect(() => parsePathParams({
            pathParameters: {
                sourcePath: new Array(21).fill('a').join('/'),
            },
        })).toThrow('Too many path segments');
    });
});

describe('apack Parser tests', () => {
    test('should parse apack path', () => {
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/.apack-manifest.xml'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: '.apack-manifest.xml',
        });
    });
    test('should parse apack path with Extras', () => {
        expect(parsePathParams({
            pathParameters: {
                sourcePath: 'github/sbcgua/repo_name/.apack-manifest.xml/extra/extrap1/extrap2'
            },
        })).toEqual({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: '.apack-manifest.xml',
            apackExtra: 'extra',
            apackExtraParam: 'extrap1/extrap2',
        });
    });
});

describe('apack Validator tests', () => {
    test('should validate correct apack path', () => {
        const params = {
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: '.apack-manifest.xml',
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual(params);
    });
    test('should validate correct apack path with Deps', () => {
        const params = {
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            branch: 'master',
            file: '.apack-manifest.xml',
            apackExtra: 'dependencies',
            apackExtraParam: 'group/artifact'
        };
        const validated = validateQueryParams(params);
        expect(validated).toEqual(params);
    });
    test('should fail on wrong extra', () => {
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: '.apack-manifest.xml',
            apackExtra: 'xyz',
            apackExtraParam: 'group/artifact'
        })).toThrow('Wrong apack extra action');
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: 'somefile.abap',
            apackExtra: 'xyz',
            apackExtraParam: 'group/artifact'
        })).toThrow('Apack params consistency failed');
        expect(() => validateQueryParams({
            type: 'github',
            owner: 'sbcgua',
            repo: 'repo_name',
            file: '.apack-manifest.xml',
            apackExtra: 'dependencies',
        })).toThrow('dependencies action expect params');
    });
});