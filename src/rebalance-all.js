import {deleteAllBalances, selectAllTransactions} from './db.js';

const rebalanceAll = async () => {
    await deleteAllBalances();

    const transactions = await selectAllTransactions();

    let balances = {};
    let year = transactions[0].date.getFullYear();
    let month = transactions[0].date.getMonth();
    let balanceDate = `${year}-${`${month + 1}`.padStart(2, '0')}-01`;

    const previousBalanceDate = balanceDate;

    transactions.forEach((transaction) => {
        const {date, fromAccountId, toAccountId, amount} = transaction;

        if (date.getMonth() !== month) {
            month++;
        }

        if (date.getFullYear() !== year) {
            year++;
        }

        /*
         * TODO: handle 12 months
         */
        balanceDate = `${year}-${`${month + 1}`.padStart(2, '0')}-01`;

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
