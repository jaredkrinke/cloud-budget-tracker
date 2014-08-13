(function (exports) {
    // Constants
    exports.transactionHistorySize = 10;

    // API
    var prefix = '/api';
    exports.transactionsPath = prefix + '/transactions';
    exports.contributionsPath = prefix + '/contributions';
    exports.summaryPath = prefix + '/summary';

    // Input validation
    var descriptionMinLength = 1;
    var descriptionMaxLength = 100;
    var amountPattern = /^(\d+|\d*\.\d{0,2})$/;
    exports.validateAmount = function (text) {
        if (amountPattern.test(text)) {
            var amount = +text;
            if (!isNaN(amount) && amount > 0) {
                return amount;
            }
        }
        return null;
    };

    exports.validateDescription = function (text) {
        if (typeof (text) === 'string' && text.length >= descriptionMinLength && text.length <= descriptionMaxLength) {
            return text;
        }
        return null;
    };

    // TODO: Needed?
    //exports.validateDate = function (text) {
    //    var date = new Date(text);
    //    if (!isNaN(date.getTime())) {
    //        return date;
    //    }
    //    return null;
    //};
})(typeof (exports) === 'undefined' ? (budgetTrackerCore = {}) : exports);
