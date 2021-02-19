import fs from 'fs';
import readline from 'readline';

import googleapis from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Adapted from: https://developers.google.com/gmail/api/quickstart/nodejs
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
];
const TOKEN_PATH = 'token.json';

const getNewToken = (oAuth2Client, callback) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                return console.error('Error retrieving access token', err);
            }

            oAuth2Client.setCredentials(token);

            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) {
                    return console.error(err);
                }
            });

            callback(oAuth2Client);
        });
    });
};

export const authorize = (credentials, callback) => {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new googleapis.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            return getNewToken(oAuth2Client, callback);
        }

        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
};
