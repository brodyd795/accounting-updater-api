import {getEmailsAndMarkAsRead} from './get-emails.js';
import {processEmails} from './process-emails.js';

const update = async () => {
    const emails = await getEmailsAndMarkAsRead();

    if (emails.length) {
        await processEmails(emails);
    }
};

update();
