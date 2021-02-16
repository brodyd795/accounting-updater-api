import Chance from 'chance';
import * as googleapis from 'googleapis';

import {authorize} from '../src/gmail-auth';

jest.mock('googleapis', () => {
    return {
        google: {
            auth: {
                OAuth2: jest.fn().mockImplementation(() => {
                    return {}
                })
            }
        }
    };
});

const chance = new Chance();

describe('gmail-auth', () => {
    let expectedCredentials,
        expectedCallback,
        mockOAuth2Client;

    beforeEach(() => {
        expectedCredentials = {
            installed: {
                client_secret: chance.string(),
                client_id: chance.string(),
                redirect_uris: [chance.string()]
            }
        };
        expectedCallback = jest.fn();

        mockOAuth2Client = {
            setCredentials: jest.fn(),
            generateAuthUrl: jest.fn(),
            getToken: jest.fn()
        };

        googleapis.google.auth.OAuth2.mockReturnValue(mockOAuth2Client);
    });

    test('should description', () => {
        authorize(expectedCredentials, expectedCallback);

        expect(googleapis.google.auth.OAuth2).toHaveBeenCalledTimes(1);
    });
});
