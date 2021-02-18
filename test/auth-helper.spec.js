import fs from 'fs';
import Chance from 'chance';

import {getCredentialsAndAuthorize} from '../src/auth-helper';
import {authorize} from '../src/gmail-auth';

const chance = new Chance();

jest.mock('../src/gmail-auth', () => ({
    authorize: jest.fn().mockImplementation((credentials, callback) => callback('my auth'))
}));
jest.mock('fs');

describe('getEmails', () => {
    let expectedCredentials,
        expectedParsedCredentials;

    beforeEach(() => {
        expectedCredentials = {
            [chance.word()]: chance.word()
        };
        expectedParsedCredentials = chance.string();
        fs.readFileSync.mockReturnValue(expectedCredentials);
        JSON.parse = jest.fn().mockImplementationOnce((creds) => expectedParsedCredentials);
    });
    test('should authorize with credentials', () => {
        getCredentialsAndAuthorize();

        expect(authorize).toHaveBeenCalledTimes(1);
        expect(authorize).toHaveBeenCalledWith(expectedParsedCredentials, expect.any(Function));
    });
});
