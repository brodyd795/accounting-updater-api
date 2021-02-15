import {getEmails} from './gmail-service.js';

const run = async () => {
    const emails = await getEmails();
    console.log('emails', emails)

	// if (emails.length) {
	// 	processEmails(emails);
	// }
};

run();
