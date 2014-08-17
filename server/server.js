var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var Datastore = require('nedb');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var BasicStrategy = require('passport-http').BasicStrategy;
var budgetTrackerCore = require('../common/budget-tracker-core.js');

// Databases
var db = new Datastore({
    filename: __dirname + '/cbt.db',
    autoload: true,
});

var users = new Datastore({
    filename: __dirname + budgetTrackerCore.userDatabaseName,
    autoload: true,
});

// Setup HTTP logging
var app = express();
app.use(morgan('dev'));

// Setup HTTP basic authentication
app.use(passport.initialize());
passport.use(new BasicStrategy(function (name, password, done) {
    users.findOne({ _id: name.toLowerCase() }, function (error, user) {
        if (error) {
            done(error);
        }
        else if (!user) {
            done(null, false);
        } else {
            bcrypt.compare(password, user.password, function (error, result) {
                if (error) {
                    done(error);
                } else {
                    done(null, result ? user : false);
                }
            });
        }
    });
}));

// Only require authentication on the API
app.use(budgetTrackerCore.prefix, passport.authenticate('basic', { session: false }));

// Data model
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

// Database interactions
var loadUserData = function (user, callback) {
    var name = user._id;
    db.findOne({ _id: name }, function (error, data) {
        if (error) {
            callback(error);
        } else {
            callback(
                null,
                data ?
                data
                    : {
                        _id: name,
                        balance: 0,
                        transactions: [],
                    }
                );
        }
    });
};

var saveTransactions = function (data, callback) {
    db.update({ _id: data._id }, data, { upsert: true }, callback);
};

// Client (static files)
app.use('/', express.static(__dirname + '/../client'));
app.use('/common', express.static(__dirname + '/../common'));

// Server
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Summary
app.route(budgetTrackerCore.summaryPath).get(function (request, response) {
    loadUserData(request.user, function (error, data) {
        if (error) {
            response.status(400);
            response.end();
        } else {
            // Remove any internal id
            delete data._id;
            response.json(data);
        }
    });
});

// Transactions
app.route(budgetTrackerCore.transactionsPath).post(function (request, response) {
    // Validate submitted transactions
    var transactions = request.body;
    var count = transactions.length;
    var valid = true;
    for (var i = 0; i < count; i++) {
        transactions[i] = validateAndCreateTransaction(transactions[i].description, transactions[i].amount);
        if (!transactions[i]) {
            valid = false;
            break;
        }
    }

    if (valid && count > 0) {
        // Transactions are valid, so add them to the database
        loadUserData(request.user, function (error, data) {
            if (error) {
                response.status(500);
                response.end();
            } else {
                // Add all the transactions
                for (var i = 0; i < count; i++) {
                    budgetTrackerCore.addTransaction(data, transactions[i]);
                }

                // Save the updated record
                saveTransactions(data, function (error) {
                    if (error) {
                        response.status(400);
                    } else {
                        response.status(201);
                    }
                    response.end();
                });
            }
        });
    } else {
        response.status(400);
        response.end();
    }
});

var server = app.listen(8888, function () {
    console.log('Listening on port %d...', server.address().port);
});
