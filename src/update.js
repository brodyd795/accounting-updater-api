import { getCredentialsAndAuthorize } from './auth-helper.js';

// import {processEmails} from './process-emails.js';

export const update = async () => {
    const emails = await getCredentialsAndAuthorize();
    console.log('emails', emails)

	// if (emails.length) {
	// 	processEmails(emails);
	// }
};
