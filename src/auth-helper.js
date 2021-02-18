import fs from 'fs';

import { getEmailsAndMarkAsRead } from './get-emails.js';
import {authorize} from './gmail-auth.js';

export const getCredentialsAndAuthorize = () => new Promise((resolve) => {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    authorize(credentials, (auth) => resolve(getEmailsAndMarkAsRead(auth)));
});
