import {getEmailsAndMarkAsRead} from './get-emails.js';
import {processEmails} from './process-emails.js';
import {init} from './sentry.js';

init();

const update = async () => {
    const emails = await getEmailsAndMarkAsRead();

    if (emails.length) {
        await processEmails(emails);
    }
};

update();
