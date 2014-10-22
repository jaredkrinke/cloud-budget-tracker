(function (exports) {
    // API
    var prefix = '/api';
    exports.prefix = prefix;
    exports.transactionsPath = prefix + '/transactions';
    exports.summaryPath = prefix + '/summary';
    exports.categoryTransactionsPath = prefix + '/transactions/:category';
    exports.categorySummaryPath = prefix + '/summary/:category';
    // TODO: Need a way to update the category's name

    // Internal
    exports.userDatabaseName = '/users.db';

    // Input validation
    var descriptionMinLength = 1;
    var descriptionMaxLength = 100;
    var amountPattern = /^-?(\d+|\d*\.\d{0,2})$/;
    var categoryMinLength = 1;
    var categoryMaxLength = 30;

    exports.validateAmount = function (text) {
        if (amountPattern.test(text)) {
            var amount = +text;
            if (!isNaN(amount) && amount != 0) {
                return amount;
            }
        }
        return null;
    };

    var createStringValidator = function (minLength, maxLength) {
        return function (text) {
            if (typeof (text) === 'string' && text.length >= minLength && text.length <= maxLength) {
                return text;
            }
            return null;
        }
    }

    exports.validateDescription = createStringValidator(descriptionMinLength, descriptionMaxLength);
    exports.validateCategory = createStringValidator(categoryMinLength, categoryMaxLength);

    // Transactions
    var transactionHistorySize = 10;
    exports.addTransaction = function (data, transaction) {
        if (data.transactions.push(transaction) > transactionHistorySize) {
            data.transactions.shift();
        }

        data.balance += transaction.amount;
    };

})(typeof (exports) === 'undefined' ? (budgetTrackerCore = {}) : exports);
