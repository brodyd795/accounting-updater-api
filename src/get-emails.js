import fs from 'fs';

import googleapis from 'googleapis';
import dotenv from 'dotenv';
import dateFns from 'date-fns';

import {authorize} from './gmail-auth.js';

dotenv.config();

const fetchEmails = async (auth) => {
    const gmail = googleapis.google.gmail({
        auth,
        version: 'v1'
    });

    const rawEmailData = await gmail.users.messages.list({
        auth,
        labelIds: 'UNREAD',
        userId: 'me'
    });
    const emails = rawEmailData.data.messages;

    if (!emails) {
        return [];
    }

    const emailResults = [];

    for (const email of emails) {
        const message = await gmail.users.messages.get({
            auth,
            id: email.id,
            userId: 'me'
        });
        const headers = message.data.payload.headers;

        const fromHeader = headers.find((header) => header.name === 'From');
        const isFromBank = fromHeader.value.toLowerCase().includes(`${process.env.BANK_EMAIL}@`);

        if (isFromBank) {
            const dateReceived = new Date(headers.find((header) => header.name === 'Date').value);
            const hoursOffset = dateReceived.getTimezoneOffset() / 60;
            const date = dateFns.subHours(dateReceived, hoursOffset);

            const body = Buffer.from(message.data.payload.parts[0].body.data, 'base64').toString();

            emailResults.push({
                body,
                date,
                id: email.id
            });
        }
    }

    return emailResults;
};

export const getEmails = () => new Promise((resolve) => {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    authorize(credentials, (auth) => resolve(fetchEmails(auth)));
});
