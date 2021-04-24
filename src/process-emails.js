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

const getAmount = (regexOne, regexTwo, body) => {
    const amountRaw = regexOne.exec(body)[0];
    let amount = regexTwo.exec(amountRaw)[0];

    amount = amount.replace(',', '');
    amount = parseFloat(amount) * 100;

    return amount;
};

const formatDateForDb = (date) => date.toISOString().split('T')[0];

const parseCreditCardPurchaseEmail = (email, identifiers, accounts) => {
    const {date, body} = email;

    const {fastFoodLocations, gasLocations, groceriesLocations} = identifiers;
    const amountAndLocation = /charged \$[\d,]+\.\d+ [^.]+?\./i.exec(body)[0];
    const amountRaw = /[\d,]+\.\d+/.exec(amountAndLocation)[0];
    const amount = parseFloat(amountRaw.replace(',', '') * 100);
    const fromAccount = getAccountId(CATEGORIES.DEBTS, NAMES.CREDIT_CARD, accounts);
    const locationRaw = /at [^.]+?\./i.exec(amountAndLocation)[0];
    const location = locationRaw.replace(/at |\./ig, '');
    const comment = location.replace(/&.+;/, '\'');
    let toAccount;

    if (fastFoodLocations.some((fastFoodLocation) => location.toLowerCase().includes(fastFoodLocation.toLowerCase()))) {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.FAST_FOOD, accounts);
    } else if (gasLocations.some((gasLocation) => location.toLowerCase().includes(gasLocation.toLowerCase()))) {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.GAS, accounts);
    } else if (groceriesLocations.some((groceriesLocation) => location.toLowerCase().includes(groceriesLocation.toLowerCase()))) {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.GROCERIES, accounts);
    } else {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.OTHER_EXPENSE, accounts);
    }

    return {
        amount,
        comment,
        date: formatDateForDb(date),
        fromAccount,
        toAccount
    };
};

const parseCheckingWithdrawalEmail = (email, identifiers, accounts) => {
    const {date, body} = email;

    const amount = getAmount(new RegExp(/transaction\s+of\s+\$[\d,]+\.\d+[^.]+?\./, 'i'), new RegExp(/[\d,]+\.\d+/), body);
    const fromAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
    let toAccount,
        comment;

    if (amount === identifiers.rentAmount) {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.BILLS, accounts);
        comment = 'Rent';
    } else if (amount === identifiers.carPaymentAmount) {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.BILLS, accounts);
        comment = 'Car payment';
    } else if (amount > 10000) {
        toAccount = getAccountId(CATEGORIES.DEBTS, NAMES.CREDIT_CARD, accounts);
        comment = 'Pay off credit card';
    } else {
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.OTHER_EXPENSE, accounts);
        comment = 'Other';
    }

    return {
        amount,
        comment,
        date: formatDateForDb(date),
        fromAccount,
        toAccount
    };
};

const parseDepositEmail = (email, identifiers, accounts) => {
    const {date, body} = email;

    const amount = getAmount(new RegExp(/Deposit\s+of\s+\$[\d,]+\.\d+/, 'i'), new RegExp(/[\d,]+\.\d+/), body);
    const toAccount = getAccountId(CATEGORIES.ASSETS, NAMES.US_BANK, accounts);
    let fromAccount,
        comment;

    if (amount > identifiers.salaryAmount) {
        fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.HY_VEE, accounts);
        comment = 'Salary from Hy-Vee';
    } else {
        fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.OTHER_INCOME, accounts);
        comment = 'Other income';
    }

    return {
        amount,
        comment,
        date: formatDateForDb(date),
        fromAccount,
        toAccount
    };
};

const parseEmail = async (email) => {
    const {body} = email;

    const {identifiers, accounts} = await getAccountsAndTransactionIdentifiers();

    if (body.includes('charged')) {
        return parseCreditCardPurchaseEmail(email, identifiers, accounts);
    } else if (body.includes('Your transaction of')) {
        return parseCheckingWithdrawalEmail(email, identifiers, accounts);
    }

    return parseDepositEmail(email, identifiers, accounts);
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
