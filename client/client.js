$(function () {
    // Constants
    var currencySymbol = '$';
    var transactionsUrl = '/api/transactions';

    // Date helpers
    //// TODO: Share stuff
    Date.prototype.year = function () { return this.getFullYear(); };
    Date.prototype.month = function () { return this.getMonth() + 1; };
    Date.prototype.day = function () { return this.getDate(); };

    // Events
    var balanceUpdated = function () { };
    var transactionsUpdated = function () { };

    // UI
    var template = $('#transaction-template').hide();
    var addDescription = $('#add-description');
    var addDescriptionGroup = $('#add-description-group');
    var addAmount = $('#add-amount');
    var addAmountGroup = $('#add-amount-group');
    //var contributeAmount = $('#contribute-amount');
    //var contributeAmountGroup = $('#contribute-amount-group');

    // TODO: Share code
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

    // TODO: Probably move down below updateAsync definition
    $('#add-form').submit(function (event) {
        event.preventDefault();

        // Validation
        var description = addDescription.val();
        var descriptionValid = (description.length > 0);
        // TODO: Ignore currency symbols in the input
        var amount = parseAmount(addAmount.val());
        var amountValid = !isNaN(amount);
        var valid = descriptionValid && amountValid;

        if (valid) {
            // Valid transaction; send it to the server
            $.ajax({
                type: 'POST',
                url: transactionsUrl,
                data: {
                    description: description,
                    amount: amount,
                },
            }).done(function () {
                updateAsync();
            }).error(function (error) {
                // TODO
                alert('POST ERROR: ' + JSON.stringify(error));
            });
        } else {
            // Highlight validation errors
            if (descriptionValid) {
                addDescriptionGroup.removeClass('has-error');
            } else {
                addDescriptionGroup.addClass('has-error');
            }

            if (amountValid) {
                addAmountGroup.removeClass('has-error');
            } else {
                addAmountGroup.addClass('has-error');
            }
        }
    });

    //$('#contribute-form').submit(function (event) {
    //    event.preventDefault();

    //    var amount = parseAmount(contributeAmount.val());
    //    var valid = !isNaN(amount);
    //    if (valid) {
    //        contributeAmountGroup.removeClass('has-error');
    //        addTransaction({
    //            description: 'Contribution',
    //            amount: -amount,
    //        })
    //    } else {
    //        contributeAmountGroup.addClass('has-error');
    //    }
    //});

    var formatAmount = function (number) {
        return (number >= 0 ? '' : '-') + currencySymbol + Math.abs(number).toFixed(2);
    };

    var formatDate = function (date) {
        return date.month() + '/' + date.day();
    }

    // Bind UI to data model
    var balanceText = $('#balance');
    var balanceStatus = $('#balance-status');

    balanceUpdated = function (balance) {
        balanceText.text(formatAmount(balance));

        var statusClass = 'panel-success';
        if (balance < 0) {
            statusClass = 'panel-danger';
        } else if (balance < 50) {
            statusClass = 'panel-warning';
        }
        balanceStatus.removeClass('panel-success panel-warning panel-danger').addClass(statusClass);
    };

    transactionsUpdated = function (transactions) {
        // Clear existing entries
        // TODO: This could be more efficient (e.g. only add/remove changed entries)
        template.siblings(':visible').remove();

        // Add new entries
        for (var i = 0; i < transactions.length; i++) {
            var transaction = transactions[i];
            var amount = transaction.amount;
            var entry = template.clone()
                .insertAfter(template)
                .show()
                .find('.transaction-description').text(transaction.description).end()
                .find('.transaction-date').text(formatDate(transaction.date)).end()
                .find('.transaction-amount').text(formatAmount(Math.abs(transaction.amount))).end();

            if (amount < 0) {
                entry.addClass('success');
            }
        }
    };

    // Update from server
    var updateAsync = function () {
        $.ajax({
            type: 'GET',
            url: transactionsUrl,
            dataType: 'json',
        }).done(function (serverState) {
            var balance = serverState.balance;
            var transactions = serverState.transactions;

            // Parse dates
            for (var i = 0, count = transactions.length; i < count; i++) {
                var transaction = transactions[i];
                transaction.date = new Date(transaction.date);
            }

            // Update UI
            balanceUpdated(balance);
            transactionsUpdated(transactions);
        }).error(function (error) {
            // TODO: What to do on error?
            alert('ERROR: ' + error);
        });
    };

    // Initial state
    updateAsync();

    // TODO: Deleting transactions
    // TODO: Automate monthly addition of funds?
});
