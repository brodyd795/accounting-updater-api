import {getEmailsAndMarkAsRead} from './get-emails.js';
import {processEmails} from './process-emails.js';

export const update = async () => {
    const emails = await getEmailsAndMarkAsRead();

    if (emails.length) {
        await processEmails(emails);
    }
};
