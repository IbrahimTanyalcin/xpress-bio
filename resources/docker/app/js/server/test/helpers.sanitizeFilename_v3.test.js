const
    {sanitizeFilename_v3} = require('../../helpers.js'),
    {randomUUID, randomBytes} = require('node:crypto');
describe(`testing helpers.sanitizeFilename_v3`, () => {

    beforeAll(async () => {
		void(0);
	});

    afterEach(async () => {
        void(0);
    });

    // Test case 1: Basic valid filenames
    test('should return valid filenames as they are', () => {
        expect(sanitizeFilename_v3('my-document.txt')).toBe('my-document.txt');
        expect(sanitizeFilename_v3('Another_File_123.pdf')).toBe('Another_File_123.pdf');
    });

    // Test case 2: Filenames with spaces and mixed cases
    test('should replace spaces with underscores', () => {
        expect(sanitizeFilename_v3('My Document With Spaces.docx')).toBe('My_Document_With_Spaces.docx');
        expect(sanitizeFilename_v3('  leading and trailing spaces  ')).toBe('_leading_and_trailing_spaces_');
    });

    // Test case 3: Removal of illegal characters
    test('should strip illegal characters', () => {
        //path normalize + path basename strips the 'file/' part!
        expect(sanitizeFilename_v3('file/with\\<illegal>:chars"|?*.txt')).toBe('withillegalchars.txt');
        expect(sanitizeFilename_v3('special[chars]{like}&these$!should^#go.zip')).toBe('specialcharsliketheseshouldgo.zip');
    });

    // Test case 4: Path traversal attempts
    test('should remove path traversal sequences', () => {
        expect(sanitizeFilename_v3('../../etc/passwd')).toBe('passwd');
        expect(sanitizeFilename_v3('/absolute/path/to/file.sh')).toBe('file.sh');
        expect(sanitizeFilename_v3('C:\\Users\\Test\\..\\..\\windows\\system32')).toBe('CUsersTestwindowssystem32');
        expect(sanitizeFilename_v3('C://Users//Test//..//..//windows//system32')).toBe('system32');
        expect(sanitizeFilename_v3('etc/Users/Test/../../windows/system32')).toBe('system32');
    });

    // Test case 5: Diacritics and non-ASCII characters
    test('should remove diacritics and normalize characters', () => {
        expect(sanitizeFilename_v3('crème-brûlée.jpg')).toBe('creme-brulee.jpg');
        expect(sanitizeFilename_v3('año-nuevo.png')).toBe('ano-nuevo.png');
        // Corrected Test: Non-ASCII are removed, then the leading dot is removed by paddingJunk.
        expect(sanitizeFilename_v3('你好世界.txt')).toBe('txt');
    });
    
    // Test case 6: Windows reserved filenames
    test('should prefix Windows reserved filenames', () => {
        expect(sanitizeFilename_v3('CON')).toBe('_CON');
        expect(sanitizeFilename_v3('PRN.txt')).toBe('_PRN.txt');
        expect(sanitizeFilename_v3('LPT1')).toBe('_LPT1');
        expect(sanitizeFilename_v3('com5.config')).toBe('_com5.config');
        expect(sanitizeFilename_v3('NUL')).toBe('_NUL');
    });

    // Test case 7: Filenames with leading/trailing junk characters
    test('should remove leading and trailing junk characters like dots, hyphens, and tildes', () => {
        expect(sanitizeFilename_v3('-.~ my-file ~.txt -')).toBe('_my-file_~.txt_');
        expect(sanitizeFilename_v3('.hiddenfile')).toBe('hiddenfile');
    });

    // Test case 8: Falsey and empty inputs
    test('should return an empty string for falsey or empty inputs', () => {
        expect(sanitizeFilename_v3(null)).toBe('');
        expect(sanitizeFilename_v3(undefined)).toBe('');
        expect(sanitizeFilename_v3('')).toBe('');
    });

    // Test case 9: Inputs that become empty after sanitization
    test('should return an empty string for inputs that are fully sanitized away', () => {
        expect(sanitizeFilename_v3('<>/?*')).toBe('');
        expect(sanitizeFilename_v3('..')).toBe('');
        expect(sanitizeFilename_v3('.')).toBe('');
    });

    // Test case 10: Filename length truncation
    test('should truncate filenames longer than 255 characters', () => {
        const longName = 'a'.repeat(300);
        const expectedName = 'a'.repeat(255);
        expect(sanitizeFilename_v3(longName)).toBe(expectedName);
        expect(sanitizeFilename_v3(longName).length).toBe(255);
    });

    // Test case 11: Complex, combined cases
    test('should correctly sanitize complex filenames with multiple issues', () => {
        const complexName = '  ../Tèst-Filé<Name>!/for_user.txt  ';
        const expected = 'for_user.txt_';
        expect(sanitizeFilename_v3(complexName)).toBe(expected);
    });

    test('should handle a mix of windows reserved names and path traversal', () => {
        const complexName = '..\\..\\LPT1.txt';
        const expected = '_LPT1.txt';
        expect(sanitizeFilename_v3(complexName)).toBe(expected);
    });

    // Test case 12: Bioinformatics-style filenames with multiple dots
    test('should not alter valid filenames with multiple extensions', () => {
        expect(sanitizeFilename_v3('somename.fasta')).toBe('somename.fasta');
        expect(sanitizeFilename_v3('somename.fas')).toBe('somename.fas');
        expect(sanitizeFilename_v3('somename.fasta.tar.gz')).toBe('somename.fasta.tar.gz');
        expect(sanitizeFilename_v3('somefile.lz4')).toBe('somefile.lz4');
        expect(sanitizeFilename_v3('somefile.bgz')).toBe('somefile.bgz');
        expect(sanitizeFilename_v3('somefile.csi')).toBe('somefile.csi');
    });

    // Add to your "Windows reserved filenames" test block
    test('should prefix a filename that becomes reserved after sanitization', () => {
        expect(sanitizeFilename_v3('C:O:N.txt')).toBe('_CON.txt');
    });

    // Add to your "Inputs that become empty after sanitization" test block
    test('should return an empty string for inputs containing only padding junk', () => {
        expect(sanitizeFilename_v3('.-~-')).toBe('');
    });

})
