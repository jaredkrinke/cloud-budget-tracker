var express = require('express');
var bodyParser = require('body-parser');
var budgetTrackerCore = require('../common/budget-tracker-core.js');

// Data model
// TODO: Save to/load from persistent storage
var balance = 0;
var transactions = [];

var addContribution = function (amount) {
    balance += amount;
};

var addTransaction = function (transaction) {
    if (transactions.push(transaction) > budgetTrackerCore.transactionHistorySize) {
        transactions.shift();
    }

    balance -= transaction.amount;
};

var validateAndCreateTransaction = function (description, amount) {
    description = budgetTrackerCore.validateDescription(description);
    amount = budgetTrackerCore.validateAmount(amount);
    if (description !== null && amount !== null) {
        return {
            date: new Date(),
            description: description,
            amount: amount,
        };
    }
    return null;
};

// Client (static files)
var app = express();
app.use('/', express.static(__dirname + '/../client'));
app.use('/common', express.static(__dirname + '/../common'));

// Server
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Summary
app.route(budgetTrackerCore.summaryPath).get(function (request, response) {
    console.log('Getting transactions...');

    response.send(JSON.stringify({
        balance: balance,
        transactions: transactions,
    }));
});

// Contributions
app.route(budgetTrackerCore.contributionsPath).post(function (request, response) {
    console.log('Adding contribution...');

    var amount = budgetTrackerCore.validateAmount(request.body.amount);
    if (amount !== null) {
        addContribution(amount);
        response.status(201);
    } else {
        response.status(400);
    }
    response.end();
});

// Transactions
app.route(budgetTrackerCore.transactionsPath).post(function (request, response) {
    console.log('Adding transaction...');
    var body = request.body;

    var transaction = validateAndCreateTransaction(body.description, body.amount);
    if (transaction) {
        addTransaction(transaction);
        response.status(201);
    } else {
        response.status(400);
    }
    response.end();
})
;

var server = app.listen(8888, function () {
    console.log('Listening on port %d...', server.address().port);
});
