import {getEmailsAndMarkAsRead} from './get-emails.js';

// import {processEmails} from './process-emails.js';

export const update = async () => {
    const emails = await getEmailsAndMarkAsRead();

    console.log('emails', emails);

    /*
     * if (emails.length) {
     * 	processEmails(emails);
     * }
     */
};
