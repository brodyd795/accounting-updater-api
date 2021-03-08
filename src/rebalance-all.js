import {deleteAllBalances, selectAllTransactions} from './db.js';

const formatBalanceDate = (date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-01`;

const rebalanceAll = async () => {
    await deleteAllBalances();

    const transactions = await selectAllTransactions();

    let balances = {};
    let balanceDate = formatBalanceDate(transactions[0].date);

    const previousBalanceDate = balanceDate;

    transactions.forEach((transaction) => {
        const {date, fromAccountId, toAccountId, amount} = transaction;

        balanceDate = formatBalanceDate(date);

        let initilizeFrom,
            initilizeTo;

        if (!balances[fromAccountId]) {
            initilizeFrom = 0;
        } else if (balances[fromAccountId][balanceDate]) {
            initilizeFrom = balances[fromAccountId][balanceDate];
        } else if (balances[fromAccountId][previousBalanceDate]) {
            initilizeFrom = balances[fromAccountId][previousBalanceDate];
        } else {
            initilizeFrom = 0;
        }

        if (!balances[toAccountId]) {
            initilizeTo = 0;
        } else if (balances[toAccountId][balanceDate]) {
            initilizeTo = balances[toAccountId][balanceDate];
        } else if (balances[toAccountId][previousBalanceDate]) {
            initilizeTo = balances[toAccountId][previousBalanceDate];
        } else {
            initilizeTo = 0;
        }

        const fromBalance = initilizeFrom - amount;
        const toBalance = initilizeTo + amount;

        balances = {
            ...balances,
            [fromAccountId]: {
                ...balances[fromAccountId],
                [balanceDate]: fromBalance
            },
            [toAccountId]: {
                ...balances[toAccountId],
                [balanceDate]: toBalance
            }
        };
    });
    console.log('balances', balances)
};

rebalanceAll();
