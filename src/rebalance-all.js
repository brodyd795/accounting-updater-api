import dateFns from 'date-fns';

import {deleteAllBalances, selectAllTransactions} from './db.js';

const formatBalanceDate = (date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-01`;

const getPreviousBalanceDate = (currentBalanceDate, previousBalanceDate) => {
    if (previousBalanceDate === undefined) {
        const monthBeforeCurrentDate = dateFns.subMonths(new Date(currentBalanceDate), 1);
        const newPreviousBalanceDate = formatBalanceDate(monthBeforeCurrentDate);

        return newPreviousBalanceDate;
    }

    if (dateFns.differenceInMonths(new Date(currentBalanceDate), new Date(previousBalanceDate)) > 1) {
        const newPreviousBalanceDate = formatBalanceDate(new Date(currentBalanceDate));

        return newPreviousBalanceDate;
    }

    return previousBalanceDate;
};

const rebalanceAll = async () => {
    await deleteAllBalances();

    const transactions = await selectAllTransactions();

    let balances = {};
    let currentBalanceDate;
    let previousBalanceDate;

    transactions.forEach((transaction) => {
        const {date, fromAccountId, toAccountId, amount} = transaction;

        currentBalanceDate = formatBalanceDate(date);
        previousBalanceDate = getPreviousBalanceDate(currentBalanceDate, previousBalanceDate);

        let initilizeFrom,
            initilizeTo;

        if (!balances[fromAccountId]) {
            initilizeFrom = 0;
        } else if (balances[fromAccountId][currentBalanceDate]) {
            initilizeFrom = balances[fromAccountId][currentBalanceDate];
        } else if (balances[fromAccountId][previousBalanceDate]) {
            initilizeFrom = balances[fromAccountId][previousBalanceDate];
        } else {
            initilizeFrom = 0;
        }

        if (!balances[toAccountId]) {
            initilizeTo = 0;
        } else if (balances[toAccountId][currentBalanceDate]) {
            initilizeTo = balances[toAccountId][currentBalanceDate];
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
                [currentBalanceDate]: fromBalance
            },
            [toAccountId]: {
                ...balances[toAccountId],
                [currentBalanceDate]: toBalance
            }
        };
    });
    console.log('balances', balances);
};

rebalanceAll();
