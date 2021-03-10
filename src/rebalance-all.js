import dateFns from 'date-fns';

import {deleteAllBalances, reinsertAllBalancesNew, selectAllTransactions} from './db.js';

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

const getCurrentAccountBalance = (accountId, balances, currentBalanceDate, previousBalanceDate) => {
    if (!balances[accountId]) {
        return 0;
    } else if (balances[accountId][currentBalanceDate]) {
        return balances[accountId][currentBalanceDate];
    } else if (balances[accountId][previousBalanceDate]) {
        return balances[accountId][previousBalanceDate];
    }

    return 0;
};

const formatBalancesForDb = (balances) => {
    const rows = [];

    Object.entries(balances).forEach(([accountId, values]) => {
        Object.entries(values).forEach(([date, balance]) => {
            rows.push({
                accountId,
                balance,
                date
            });
        });
    });

    return rows;
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

        const fromBalance = getCurrentAccountBalance(fromAccountId, balances, currentBalanceDate, previousBalanceDate) - amount;
        const toBalance = getCurrentAccountBalance(toAccountId, balances, currentBalanceDate, previousBalanceDate) + amount;

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
    const balancesToInsert = formatBalancesForDb(balances);

    await reinsertAllBalancesNew(balancesToInsert);
};

rebalanceAll();
