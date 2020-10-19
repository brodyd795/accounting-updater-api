const imaps = require("imap-simple");
const db = require("./db");
const dotenv = require("dotenv");

dotenv.config();

let config = {
	imap: {
		user: process.env.EMAIL,
		password: process.env.EMAIL_PASSWORD,
		host: "imap.gmail.com",
		port: 993,
		tls: true,
		authTimeout: 3000,
	},
};

const run = async () => {
	const connection = await imaps.connect(config);

	await connection.openBox("INBOX");
	const searchCriteria = ["UNSEEN", ["FROM", process.env.BANK_EMAIL]];

	const fetchOptions = {
		bodies: ["HEADER", "TEXT"],
		markSeen: true,
	};

	const emails = await connection.search(searchCriteria, fetchOptions);

	if (emails.length) {
		processEmails(emails);
	}

	await connection.imap.closeBox(true, (err) => {
		if (err) {
			console.log(err);
		}
	});
	connection.end();
};

const processEmails = async (emails) => {
	const lastId = await db.getLastId();
	const transactions = [];

	const today = parseInt(
		new Date().toISOString().slice(0, 10).replace(/-/g, "").replace(/$/, "00")
	);

	for (let i = 0; i < emails.length; i++) {
		const body = emails[i].parts[0].body;

		let id;
		if (lastId) {
			id = today > lastId ? today + i : lastId + i + 1;
		} else {
			id = today + i;
		}

		const results = await parseEmail(body);

		transactions.push({ id, ...results });
	}

	await processTransactions(transactions);
};

const parseEmail = async (body) => {
	let amount, toAccount, fromAccount, comment, amountRaw, location;

	const {
		fastFoodLocations,
		gasLocations,
		groceriesLocations,
		rentAmount,
		carPaymentAmount,
		salaryAmount,
	} = await db.getTransactionIdentifiers();

	if (body.includes("charged")) {
		// transactions on credit card
		amountRaw = /charged \$[\d,]+\.\d+ [^\.]+?\./.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;

		fromAccount = "L_Credit_Card";

		location = /at [^\.]+?\./.exec(amountRaw)[0];
		location = location.replace(/at |\./g, "");
		comment = location;

		// check if the location contains a substring of a location type (e.g., "McDonalds", "Hy-Vee")
		if (
			fastFoodLocations.some((fastFoodLocation) =>
				location.includes(fastFoodLocation)
			)
		) {
			toAccount = "E_Fast_Food";
		} else if (
			gasLocations.some((gasLocation) => location.includes(gasLocation))
		) {
			toAccount = "E_Gas";
		} else if (
			groceriesLocations.some((groceriesLocation) =>
				location.includes(groceriesLocation)
			)
		) {
			toAccount = "E_Groceries";
		} else {
			toAccount = "E_Other";
		}
	} else if (body.includes("Your transaction of")) {
		// withdrawals from checking account
		amountRaw = /transaction\s+of\s+\$[\d,]+\.\d+[^\.]+?\./.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;

		if (amount === rentAmount) {
			fromAccount = "A_US_Bank";
			toAccount = "E_Bills";
			comment = "Rent";
		} else if (amount === carPaymentAmount) {
			fromAccount = "A_US_Bank";
			toAccount = "E_Bills";
			comment = "Car payment";
		} else if (amount > 10000) {
			fromAccount = "A_US_Bank";
			toAccount = "L_Credit_Card";
			comment = "Pay off credit card";
		} else {
			fromAccount = "A_US_Bank";
			toAccount = "E_Other";
			comment = "Other";
		}
	} else if (body.includes("Deposit")) {
		// 	deposits to checking account
		amountRaw = /Deposit\s+of\s+\$[\d,]+\.\d+/.exec(body)[0];
		amount = /[\d,]+\.\d+/.exec(amountRaw)[0];
		amount = amount.replace(",", "");
		amount = parseFloat(amount) * 100;

		if (amount > salaryAmount) {
			fromAccount = "I_Hy-Vee";
			comment = "Salary from Hy-Vee";
		} else {
			fromAccount = "I_Other";
			comment = "Other income";
		}

		toAccount = "A_US_Bank";
	}

	return {
		toAccount,
		fromAccount,
		amount,
		comment,
	};
};

const processTransaction = async (transaction) => {
	let accountBalances = await db.getLastAccountBalances(
		transaction.toAccount,
		transaction.fromAccount,
		transaction.id
	);
	transaction.toAccountBalance = accountBalances.toAccount + transaction.amount;
	transaction.fromAccountBalance =
		accountBalances.fromAccount - transaction.amount;

	await db.insertTransaction(transaction);
};

async function processTransactions(transactions) {
	for (let transaction of transactions) {
		await processTransaction(transaction);
	}
}

run();
