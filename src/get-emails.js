import googleapis from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export const getEmailsAndMarkAsRead = async (auth) => {
    const gmail = googleapis.google.gmail({version: 'v1', auth});

    const rawEmailData = await gmail.users.messages.list({
        auth,
        userId: 'me',
        labelIds: 'UNREAD'
    });
    const emails = rawEmailData.data.messages;

    if (!emails) {
        return [];
    }

    let emailBodies = [];

    for (let email of emails) {
        const message = await gmail.users.messages.get({auth, userId: 'me', id: email.id});
        const fromHeader = message.data.payload.headers.find((header) => header.name === 'From');
        const isFromBank = fromHeader.value.includes(process.env.BANK_EMAIL);
    
        if (isFromBank) {
            const body = Buffer.from(message.data.payload.parts[0].body.data, 'base64').toString();
            emailBodies.push(body)
        }

        await gmail.users.messages.modify({auth, userId: 'me', id: email.id, resource: {removeLabelIds: ['UNREAD']}});
    }

    return emailBodies;
};

