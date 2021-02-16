import {getEmails} from './gmail-service.js';
// import {processEmails} from './process-emails.js';

export const update = async () => {
    const emails = await getEmails();
    // console.log('emails', emails)

	// if (emails.length) {
	// 	processEmails(emails);
	// }
};
