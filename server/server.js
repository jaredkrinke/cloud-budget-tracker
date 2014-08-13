var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Constants
var transactionHistorySize = 10;

// Date helpers
Date.today = function () {
    return new Date();
};

// Data model
// TODO: Save to/load from persistent storage
var balance = 0;
var transactions = [];

var addTransaction = function (transaction) {
    if (transactions.push(transaction) > transactionHistorySize) {
        transactions.shift();
    }

    balance -= transaction.amount;
};

// Input validation
var descriptionMinLength = 1;
var descriptionMaxLength = 100;
var amountPattern = /^(\d+|\d*\.\d{0,2})$/;
var parseAmount = function (text) {
    if (amountPattern.test(text)) {
        var amount = +text;
        if (!isNaN(amount) && amount > 0) {
            return amount;
        }
    }
    return NaN;
};

var validateAndCreateTransaction = function (description, amountString) {
    if (description && amountString) {
        var descriptionValid = (description && description.length >= descriptionMinLength && description.length <= descriptionMaxLength);
        var amount = parseAmount(amountString);
        var amountValid = !isNaN(amount);
        if (descriptionValid && amountValid) {
            return {
                date: Date.today(),
                description: description,
                amount: amount,
            };
        }
    }
    return null;
};

// Client
app.use('/', express.static(__dirname + '/../client'));

// Server
app.route('/api')
.get(function (request, response) {
    console.log('Received GET request.');

    response.send(JSON.stringify({
        balance: balance,
        transactions: transactions,
    }));
})
.post(function (request, response) {
    console.log('Received POST request:');
    // TODO: What if the body that is sent is huge?
    var body = request.body;

    var transaction = validateAndCreateTransaction(body.description, body.amount);
    if (transaction) {
        response.status(201);
        addTransaction(transaction);
    } else {
        response.status(400);
    }

    response.end();
})
;

var server = app.listen(8888, function () {
    console.log('Listening on port %d...', server.address().port);
});
