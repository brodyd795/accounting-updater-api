import fs from 'fs';

import googleapis from 'googleapis';
import dotenv from 'dotenv';

import {authorize} from './gmail-auth.js';

dotenv.config();

const getEmails = async (auth) => {
    const gmail = googleapis.google.gmail({version: 'v1', auth});

    const rawEmailData = await gmail.users.messages.list({
        auth,
        userId: 'me',
        labelIds: 'UNREAD'
    });
    const emails = rawEmailData.data.messages;

    if (!emails) {
        return [];
    }

    const emailBodies = [];

    for (const email of emails) {
        const message = await gmail.users.messages.get({auth, userId: 'me', id: email.id});
        const fromHeader = message.data.payload.headers.find((header) => header.name === 'From');
        const isFromBank = fromHeader.value.includes(process.env.BANK_EMAIL);

        if (isFromBank) {
            const body = Buffer.from(message.data.payload.parts[0].body.data, 'base64').toString();

            emailBodies.push(body);
        }

        await gmail.users.messages.modify({auth, userId: 'me', id: email.id, resource: {removeLabelIds: ['UNREAD']}});
    }

    return emailBodies;
};

export const getEmailsAndMarkAsRead = () => new Promise((resolve) => {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    authorize(credentials, (auth) => resolve(getEmails(auth)));
});
