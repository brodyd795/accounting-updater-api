const db = require("./db");
const dotenv = require("dotenv");

dotenv.config();

const CATEGORIES = {
	LIABILITY: 'Liability',
	EXPENSE: 'Expense',
	ASSET: 'Asset'
};

const NAMES = {
	CREDIT_CARD: 'Credit Card',
	FAST_FOOD: 'Fast Food',
	GAS: 'Gas',
	GROCERIES: 'Groceries',
	OTHER: 'Other',
	US_BANK: 'US Bank',
	BILLS: 'Bills'
};

const run = async () => {
	// fetch emails here	

	// if (emails.length) {
	// 	processEmails(emails);
	// }
};

const processEmails = async (emails) => {
	for (let i = 0; i < emails.length; i++) {
		const body = emails[i].parts[0].body;

		const results = await parseEmail(body);

		transactions.push({results});
	}

	await processTransactions(transactions);
};

const getAccountId = (categoryToFind, nameToFind, accounts) => accounts.find(({category, name}) => category === categoryToFind && name === nameToFind).id;

const parseEmail = async (body) => {
	let amount, toAccount, fromAccount, comment, amountRaw, location;

	const [identifiers, accounts] = await Promise.all([db.getTransactionIdentifiers(), db.getAccounts()]);
	const {
		fastFoodLocations,
		gasLocations,
		groceriesLocations,
		rentAmount,
		carPaymentAmount,
		salaryAmount,
	} = identifiers;

	if (body.includes("charged")) {
		// transactions on credit card
		amountRaw = /charged \$[\d,]+\.\d+ [^\.]+?\./.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;

		fromAccount = getAccountId(CATEGORIES.LIABILITY, NAMES.CREDIT_CARD, accounts);

		location = /at [^\.]+?\./.exec(amountRaw)[0];
		location = location.replace(/at |\./g, "");
		comment = location;

		// check if the location contains a substring of a location type (e.g., "McDonalds", "Hy-Vee")
		if (fastFoodLocations.some((fastFoodLocation) => location.includes(fastFoodLocation))) {
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.FAST_FOOD, accounts);
		} else if (gasLocations.some((gasLocation) => location.includes(gasLocation))) {
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.GAS, accounts);
		} else if (groceriesLocations.some((groceriesLocation) => location.includes(groceriesLocation))) {
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.GROCERIES, accounts);
		} else {
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.OTHER, accounts);
		}
	} else if (body.includes("Your transaction of")) {
		// withdrawals from checking account
		amountRaw = /transaction\s+of\s+\$[\d,]+\.\d+[^\.]+?\./.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;
		
		if (amount === rentAmount) {
			fromAccount = getAccountId(CATEGORIES.ASSET, NAMES.US_BANK, accounts);
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.BILLS, accounts);
			comment = "Rent";
		} else if (amount === carPaymentAmount) {
			fromAccount = getAccountId(CATEGORIES.ASSET, NAMES.US_BANK, accounts);
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.BILLS, accounts);
			comment = "Car payment";
		} else if (amount > 10000) {
			fromAccount = getAccountId(CATEGORIES.ASSET, NAMES.US_BANK, accounts);
			toAccount = getAccountId(CATEGORIES.LIABILITY, NAMES.CREDIT_CARD, accounts);
			comment = "Pay off credit card";
		} else {
			fromAccount = getAccountId(CATEGORIES.ASSET, NAMES.US_BANK, accounts);
			toAccount = getAccountId(CATEGORIES.EXPENSE, NAMES.OTHER, accounts);
			comment = "Other";
		}
	} else if (body.includes("Deposit")) {
		// 	deposits to checking account
		amountRaw = /Deposit\s+of\s+\$[\d,]+\.\d+/.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;

		if (amount > salaryAmount) {
			fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.HY_VEE, accounts);
			comment = "Salary from Hy-Vee";
		} else {
			fromAccount = getAccountId(CATEGORIES.INCOME, NAMES.OTHER, accounts);
			comment = "Other income";
		}
		
		toAccount = getAccountId(CATEGORIES.ASSET, NAMES.US_BANK, accounts);
	}

	return {
		toAccount,
		fromAccount,
		amount,
		comment,
	};
};

const processTransaction = async (transaction) => {
	await db.insertTransaction(transaction);
};

async function processTransactions(transactions) {
	for (let transaction of transactions) {
		await processTransaction(transaction);
	}
}

run();
