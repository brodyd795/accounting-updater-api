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

const parseCreditCardPurchaseEmail = (body, identifiers, accounts) => {
    const {fastFoodLocations, gasLocations, groceriesLocations} = identifiers;
    const amountAndLocation = /charged \$[\d,]+\.\d+ [^\.]+?\./.exec(body)[0];
    const amountRaw = /[\d,]+\.\d+/.exec(amountAndLocation)[0];
    const amount = parseFloat(amountRaw.replace(',', '') * 100);
    const fromAccount = getAccountId(CATEGORIES.DEBTS, NAMES.CREDIT_CARD, accounts);
    const locationRaw = /at [^\.]+?\./.exec(amountAndLocation)[0];
    const location = locationRaw.replace(/at |\./g, '');
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
        fromAccount,
        toAccount
    };
};

const parseCheckingWithdrawalEmail = (body, identifiers, accounts) => {
    const amount = getAmount(new RegExp(/transaction\s+of\s+\$[\d,]+\.\d+[^.]+?\./), new RegExp(/[\d,]+\.\d+/), body);
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
        toAccount = getAccountId(CATEGORIES.EXPENSES, NAMES.OTHER, accounts);
        comment = 'Other';
    }

    return {
        amount,
        comment,
        fromAccount,
        toAccount
    };
};

const parseDepositEmail = (body, identifiers, accounts) => {
    const amount = getAmount(new RegExp(/Deposit\s+of\s+\$[\d,]+\.\d+/), new RegExp(/[\d,]+\.\d+/), body);
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
        fromAccount,
        toAccount
    };
};

const parseEmail = async (body) => {
    const {identifiers, accounts} = await getAccountsAndTransactionIdentifiers();

    if (body.includes('charged')) {
        return parseCreditCardPurchaseEmail(body, identifiers, accounts);
    } else if (body.includes('Your transaction of')) {
        return parseCheckingWithdrawalEmail(body, identifiers, accounts);
    } else if (body.includes('Deposit')) {
        return parseDepositEmail(body, identifiers, accounts);
    }
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
