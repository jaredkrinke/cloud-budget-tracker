var app = require('express')();

// Data model
var balance = 0;
var transactions = [];

var addTransaction = function (transaction) {
    transactions.push(transaction);
    balance -= transaction.amount;
};

app.get('/', function (request, response) {
    response.send(JSON.stringify({
        balance: balance,
        transactions: transactions,
    }));
});

var server = app.listen(8888, function () {
    console.log('Listening on port %d...', server.address().port);
});
