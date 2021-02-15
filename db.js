import mysql from 'serverless-mysql';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql({
	config: {
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	},
});

export const insertTransaction = async (transaction) => {
	let {
		toAccount,
		fromAccount,
		amount,
		comment,
	} = transaction;

	await db.query(
		`INSERT INTO transactions (fromAccountId, toAccountId, amount, comment) VALUES(?, ?, ?, ?)`,
		[
			fromAccount,
			toAccount,
			amount,
			comment,
		]
	);

	await db.quit();
	return "OK";
};

export const getLastId = async () => {
	let lastId;

	lastId = await db.query(`SELECT MAX(trn_id) max_id FROM transactions`);

	lastId = lastId[0]["max_id"];
	await db.quit();
	return lastId;
};

export const getTransactionIdentifiers = async () => {
	const rows = await db.query(`SELECT * FROM transaction_identifiers`);
	await db.quit();

	const identifiers = {
		fastFoodLocations: [],
		gasLocations: [],
		groceriesLocations: [],
		rentAmount: null,
		carPaymentAmount: null,
		salaryAmount: null,
	};

	for (let row of rows) {
		switch (row.trn_type) {
			case "restaurant":
				identifiers.fastFoodLocations.push(row.trn_identifier);
				break;
			case "gas":
				identifiers.gasLocations.push(row.trn_identifier);
				break;
			case "grocery":
				identifiers.groceriesLocations.push(row.trn_identifier);
				break;
			case "rent":
				identifiers.rentAmount = row.trn_identifier;
				break;
			case "carPayment":
				identifiers.carPaymentAmount = row.trn_identifier;
				break;
			case "salary":
				identifiers.salaryAmount = row.trn_identifier;
		}
	}
	return identifiers;
};

export const getLastAccountBalances = async (toAccount, fromAccount, id) => {
	const lastAccountBalances = {};

	const toAccountResults = await db.query(
		`
		SELECT to_account, from_account, to_balance, from_balance FROM transactions WHERE (to_account = ? OR from_account = ?) AND (trn_id < ?) ORDER BY trn_id desc limit 1
	`,
		[toAccount, toAccount, id]
	);
	const fromAccountResults = await db.query(
		`
		SELECT to_account, from_account, to_balance, from_balance FROM transactions WHERE (to_account = ? OR from_account = ?) AND (trn_id < ?) ORDER BY trn_id desc limit 1
	`,
		[fromAccount, fromAccount, id]
	);

	if (toAccountResults.length) {
		if (toAccountResults[0].to_account === toAccount) {
			lastAccountBalances.toAccount = toAccountResults[0].to_balance;
		} else {
			lastAccountBalances.toAccount = toAccountResults[0].from_balance;
		}
	} else {
		lastAccountBalances.toAccount = 0;
	}

	if (fromAccountResults.length) {
		if (fromAccountResults[0].to_account === fromAccount) {
			lastAccountBalances.fromAccount = fromAccountResults[0].to_balance;
		} else {
			lastAccountBalances.fromAccount = fromAccountResults[0].from_balance;
		}
	} else {
		lastAccountBalances.fromAccount = 0;
	}

	await db.quit();
	return lastAccountBalances;
};

export const getAccounts = async () => {
	const accounts = await db.query(`SELECT id, category, name FROM accounts`);

	await db.quit();

	return accounts;
}
