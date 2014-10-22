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

    // TODO: Do I really need this?
    var alphabet = /[a-z]/i;
    exports.canonicalizePathSegment = function (text) {
        var input = text.substring(0, 20);
        var output = '';
        for (var i = 0, count = input.length; i < count; i++) {
            var character = input[i];
            if (alphabet.test(character)) {
                output += character.toLowerCase();
            } else {
                output += '-';
            }
        }

        return output;
    }

    // Transactions
    var transactionHistorySize = 10;
    exports.addTransaction = function (data, transaction) {
        if (data.transactions.push(transaction) > transactionHistorySize) {
            data.transactions.shift();
        }

        data.balance += transaction.amount;
    };

})(typeof (exports) === 'undefined' ? (budgetTrackerCore = {}) : exports);
