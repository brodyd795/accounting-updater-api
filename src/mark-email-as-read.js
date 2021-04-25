import fs from 'fs';

import googleapis from 'googleapis';
import dotenv from 'dotenv';

import {authorize} from './gmail-auth.js';

dotenv.config();

const markAsRead = (auth, id) => {
    const gmail = googleapis.google.gmail({
        auth,
        version: 'v1'
    });

    return gmail.users.messages.modify({
        auth,
        id,
        resource: {
            removeLabelIds: ['UNREAD']
        },
        userId: 'me'
    });
};

export const markEmailAsRead = (id) => new Promise((resolve) => {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    authorize(credentials, (auth) => resolve(markAsRead(auth, id)));
});
