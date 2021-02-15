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

const authorize = (credentials, callback) => {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new googleapis.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            return getNewToken(oAuth2Client, callback);
        };

        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

const getNewToken = (oAuth2Client, callback) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                return console.error('Error retrieving access token', err);
            };
            
            oAuth2Client.setCredentials(token);

            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) {
                    return console.error(err);
                };
            });

            callback(oAuth2Client);
        });
    });
};

const getEmailsAndMarkAsRead = async (auth) => {
    const gmail = googleapis.google.gmail({version: 'v1', auth});

    const rawEmailData = await gmail.users.messages.list({
        auth,
        userId: 'me',
        labelIds: 'UNREAD'
    });
    const emails = rawEmailData.data.messages;

    if (!emails.length) {
        return [];
    }

    let emailBodies = [];

    for (let email of emails) {
        const message = await gmail.users.messages.get({auth, userId: 'me', id: email.id});
        const fromHeader = message.data.payload.headers.find((header) => header.name === 'From');
        const isFromBank = fromHeader.value.includes(process.env.BANK_EMAIL);
    
        if (isFromBank) {
            const body = Buffer.from(message.data.payload.parts[0].body.data, 'base64').toString();
            emailBodies.push(body)
        }

        await gmail.users.messages.modify({auth, userId: 'me', id: email.id, resource: {removeLabelIds: ['UNREAD']}});
    }

    return emailBodies;
};

export const getEmails = () => new Promise((resolve) => {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    authorize(credentials, (auth) => resolve(getEmailsAndMarkAsRead(auth)));
});
