import dotenv from 'dotenv';

import {insertTransaction, getAccountsAndTransactionIdentifiers} from './db.js';

dotenv.config();

const CATEGORIES = {
    ASSETS: 'Assets',
    DEBTS: 'Debts',
    EXPENSES: 'Expenses',
    INCOME: 'Income'
};

const NAMES = {
    BILLS: 'Bills',
    CREDIT_CARD: 'Credit_Card',
    FAST_FOOD: 'Fast_Food',
    GAS: 'Gas',
    GROCERIES: 'Groceries',
    HY_VEE: 'Hy-Vee',
    OTHER_EXPENSE: 'Other_Expense',
    OTHER_INCOME: 'Other_Income',
    US_BANK: 'US_Bank'
};

const getAccountId = (categoryToFind, nameToFind, accounts) => accounts.find(({category, accountName}) => category === categoryToFind && accountName === nameToFind).accountId;

const parseEmail = async (body) => {
    let amount,
        toAccount,
        fromAccount,
        comment,
        amountRaw,
        location;

    const {identifiers, accounts} = await getAccountsAndTransactionIdentifiers();
    const {
        fastFoodLocations,
        gasLocations,
        groceriesLocations,
        rentAmount,
        carPaymentAmount,
        salaryAmount
    } = identifiers;

    const getAmount = (regexOne, regexTwo) => {
        amountRaw = regexOne.exec(body)[0];
        amount = regexTwo.exec(amountRaw)[0];
        amount = amount.replace(',', '');
        amount = parseFloat(amount) * 100;

        return amount;
    };

    if (body.includes('charged')) {
        // transactions on credit card
        amount = getAmount(new RegExp(/charged \$[\d,]+\.\d+ [^\.]+?\./), new RegExp(/[\d,]+\.\d+/));
        fromAccount = getAccountId(CATEGORIES.DEBTS, NAMES.CREDIT_CARD, accounts);

        location = /at [^\.]+?\./.exec(amountRaw)[0];
        location = location.replace(/at |\./g, '');
        comment = location;

        // check if the location contains a substring of a location type (e.g., "McDonalds", "Hy-Vee")
        if (fastFoodLocations.some((fastFoodLocation) => location.includes(fastFoodLocation))) {
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.FAST_FOOD, accounts);
        } else if (gasLocations.some((gasLocation) => location.includes(gasLocation))) {
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.GAS, accounts);
        } else if (groceriesLocations.some((groceriesLocation) => location.includes(groceriesLocation))) {
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.GROCERIES, accounts);
        } else {
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.OTHER_EXPENSE, accounts);
        }
    } else if (body.includes('Your transaction of')) {
        // withdrawals from checking account
        amount = getAmount(new RegExp(/transaction\s+of\s+\$[\d,]+\.\d+[^.]+?\./), new RegExp(/[\d,]+\.\d+/));

        if (amount === rentAmount) {
            fromAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.BILLS, accounts);
            comment = 'Rent';
        } else if (amount === carPaymentAmount) {
            fromAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.BILLS, accounts);
            comment = 'Car payment';
        } else if (amount > 10000) {
            fromAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
            toAccount = getAccountId(CATEGORIES.DEBTS, NAMES.CREDIT_CARD, accounts);
            comment = 'Pay off credit card';
        } else {
            fromAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
            toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.OTHER, accounts);
            comment = 'Other';
        }
    } else if (body.includes('Deposit')) {
        // 	deposits to checking account
        amount = getAmount(new RegExp(/Deposit\s+of\s+\$[\d,]+\.\d+/), new RegExp(/[\d,]+\.\d+/));

        if (amount > salaryAmount) {
            fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.HY_VEE, accounts);
            comment = 'Salary from Hy-Vee';
        } else {
            fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.OTHER_INCOME, accounts);
            comment = 'Other income';
        }

        toAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
    }

    return {
        amount,
        comment,
        fromAccount,
        toAccount
    };
};

const processTransaction = async (transaction) => {
    await insertTransaction(transaction);
};

const processTransactions = async (transactions) => {
    for (const transaction of transactions) {
        await processTransaction(transaction);
    }
};

export const processEmails = async (emails) => {
    const transactions = [];

    for (const email of emails) {
        const results = await parseEmail(email);

        transactions.push(results);
    }

    await processTransactions(transactions);
};
