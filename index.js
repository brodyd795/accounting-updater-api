const {getEmails} = require("./gmail-service");

const run = async () => {
    const emails = await getEmails();
    console.log('emails', emails)

	// if (emails.length) {
	// 	processEmails(emails);
	// }
};

run();
