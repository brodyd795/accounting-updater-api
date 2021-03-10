import mysql from 'serverless-mysql';
import dotenv from 'dotenv';
import dateFns from 'date-fns';

dotenv.config();

const db = mysql({
    config: {
        database: `${process.env.DB_NAME}`,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        user: process.env.DB_USER
    }
});

const formatDateForDb = (str) => str.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

export const insertTransaction = async (transaction) => {
    const {
        toAccount,
        fromAccount,
        amount,
        comment
    } = transaction;

    const now = new Date();
    const date = now.toISOString().split('T')[0];

    await db.query(
        'INSERT INTO transactions (date, fromAccountId, toAccountId, amount, comment) VALUES(?, ?, ?, ?, ?)',
        [
            date,
            fromAccount,
            toAccount,
            amount,
            comment
        ]
    );

    db.quit();

    return 'OK';
};

export const getAccountsAndTransactionIdentifiers = async () => {
    const [accounts, rows] = await Promise.all([
        db.query('SELECT accountId, category, accountName FROM accounts'),
        db.query('SELECT * FROM transaction_identifiers')
    ]);

    db.quit();

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

export const getLastMonthsTransactionsAndPreviousBalances = async () => {
    const startOfMonthToBalance = dateFns.subHours(dateFns.startOfMonth(new Date()), 6);
    const startOfNewMonth = dateFns.subHours(dateFns.addMonths(startOfMonthToBalance, 1), 6);
    const formattedStartOfMonthToBalance = formatDateForDb(startOfMonthToBalance);
    const formattedStartOfNewMonth = formatDateForDb(startOfNewMonth);

    const [balances, transactions] = await Promise.all([
        db.query('SELECT accountId, balance FROM balances WHERE date = ?', [formattedStartOfMonthToBalance]),
        db.query('SELECT * FROM transactions WHERE date >= ? AND date < ?', [formattedStartOfMonthToBalance, formattedStartOfNewMonth])
    ]);

    db.quit();

    return {
        balances,
        transactions
    };
};

export const insertNewBalances = async (balances) => {
    const startOfNewMonth = dateFns.subHours(dateFns.addMonths(dateFns.startOfMonth(new Date()), 1), 6);
    const formattedStartOfNewMonth = formatDateForDb(startOfNewMonth);

    const valuesString = Object.entries(balances).reduce((acc, current) => `${acc}, (${current[0]}, ${current[1]}, '${formattedStartOfNewMonth}')`, '').slice(2);

    await db.query(`INSERT INTO balances (accountId, balance, date) values ${valuesString}`);
    db.quit();
};

export const reinsertAllBalancesNew = async (balances) => {
    const valuesString = balances.reduce((acc, current) => `${acc}, (${current.accountId}, ${current.balance}, '${current.date}')`, '').slice(2);

    await db.query(`INSERT INTO balances (accountId, balance, date) values ${valuesString}`);
    db.quit();
};

export const deleteAllBalances = async () => {
    await db.query('DELETE FROM balances WHERE balanceId > 0');
    db.quit();

    return;
};

export const selectAllTransactions = async () => {
    const transactions = await db.query('SELECT date, fromAccountId, toAccountId, amount FROM transactions ORDER BY date');

    db.quit();

    return transactions;
};
