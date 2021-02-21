import mysql from 'serverless-mysql';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql({
    config: {
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER
    }
});

export const insertTransaction = async (transaction) => {
    const {
        toAccount,
        fromAccount,
        amount,
        comment
    } = transaction;

    await db.query(
        'INSERT INTO transactions (fromAccountId, toAccountId, amount, comment) VALUES(?, ?, ?, ?)',
        [
            fromAccount,
            toAccount,
            amount,
            comment
        ]
    );

    await db.quit();

    return 'OK';
};

export const getLastId = async () => {
    let lastId;

    lastId = await db.query('SELECT MAX(trn_id) max_id FROM transactions');

    lastId = lastId[0]['max_id'];
    await db.quit();

    return lastId;
};

export const getAccountsAndTransactionIdentifiers = async () => {
    const [accounts, rows] = await Promise.all([
        db.query('SELECT accountId, category, accountName FROM accounts'),
        db.query('SELECT * FROM transaction_identifiers')
    ]);

    await db.quit();

    const identifiers = {
        carPaymentAmount: null,
        fastFoodLocations: [],
        gasLocations: [],
        groceriesLocations: [],
        rentAmount: null,
        salaryAmount: null
    };

    for (const row of rows) {
        switch (row.identifierType) {
            case 'restaurant':
                identifiers.fastFoodLocations.push(row.identifier);

                break;
            case 'gas':
                identifiers.gasLocations.push(row.identifier);

                break;
            case 'grocery':
                identifiers.groceriesLocations.push(row.identifier);

                break;
            case 'rent':
                identifiers.rentAmount = row.identifier;

                break;
            case 'carPayment':
                identifiers.carPaymentAmount = row.identifier;

                break;
            default:
                identifiers.salaryAmount = row.identifier;
        }
    }

    return {
        accounts,
        identifiers
    };
};
