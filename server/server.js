var express = require('express');
var bodyParser = require('body-parser');
var Datastore = require('nedb');
var budgetTrackerCore = require('../common/budget-tracker-core.js');

// Load from the database
var db = new Datastore({
    filename: __dirname + '/cbt.db',
    autoload: true,
});

var key = 'cbt';

db.findOne({ _id: key }, function (error, document) {
    // TODO: Maybe don't keep these around?
    var balance;
    var transactions;

    if (error || !document) {
        balance = 0;
        transactions = [];
    } else {
        // TODO: Better resiliency?
        balance = document.balance;
        transactions = document.transactions;
    }

    // Data model
    var addTransactionAsync = function (transaction, callback) {
        if (transactions.push(transaction) > budgetTrackerCore.transactionHistorySize) {
            transactions.shift();
        }

        balance += transaction.amount;

        // Update the database
        db.update(
            { _id: key },
            {
                balance: balance,
                transactions: transactions,
            },
            { upsert: true },
            callback
        );
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
        db.findOne({ _id: key }, function (error, document) {
            if (error) {
                response.status(400);
                response.end();
            } else {
                if (document) {
                    // Remove the internal-only id
                    delete document._id;
                } else {
                    // No document was found, so return an empty summary
                    document = {
                        balance: 0,
                        transactions: [],
                    };
                }

                response.send(JSON.stringify(document));
            }
        });
    });

    // Transactions
    app.route(budgetTrackerCore.transactionsPath).post(function (request, response) {
        console.log('Adding transaction...');
        var body = request.body;

        var transaction = validateAndCreateTransaction(body.description, body.amount);
        if (transaction) {
            addTransactionAsync(transaction, function (error) {
                if (error) {
                    response.status(400);
                } else {
                    response.status(201);
                    console.log('Transaction added.');
                }
                response.end();
            });
        } else {
            response.status(400);
            response.end();
        }
    })
    ;

    var server = app.listen(8888, function () {
        console.log('Listening on port %d...', server.address().port);
    });
});
