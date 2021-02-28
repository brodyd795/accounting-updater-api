import {getLastMonthsTransactionsAndPreviousBalances, insertNewBalances} from './db.js';

export const updateBalances = async () => {
    const {balances, transactions} = await getLastMonthsTransactionsAndPreviousBalances();

    const balancesObject = balances.reduce((acc, current) => ({
        ...acc,
        [current.accountId]: current.balance
    }), {});

    transactions.map((transaction) => {
        const {fromAccountId, toAccountId, amount} = transaction;

        balancesObject[fromAccountId] = balancesObject[fromAccountId] ? balancesObject[fromAccountId] - amount : amount * -1;
        balancesObject[toAccountId] = balancesObject[toAccountId] ? balancesObject[toAccountId] + amount : amount;
    });

    await insertNewBalances(balancesObject);
};
