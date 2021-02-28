import express from 'express';

import {updateTransactions} from './update-transactions.js';
import {updateBalances} from './update-balances.js';

const app = express();
const port = 8082;

app.post('/transactions/update', async (req, res) => {
    try {
        await updateTransactions();
        res.status(200).json({message: 'Transactions successfully updated.'});
    } catch (error) {
        console.log('error', error);
        res.status(500).json({error});
    }
});

app.put('/balances/update', async (req, res) => {
    try {
        await updateBalances();
        res.status(200).json({message: 'Balances successfully updated.'});
    } catch (error) {
        console.log('error', error);
        res.status(500).json({error});
    }
});

app.listen(port, () => {
    console.log(`Accounting updater listening at http://localhost:${port}`);
});
