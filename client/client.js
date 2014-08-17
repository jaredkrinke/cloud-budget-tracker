$(function () {
    // Constants
    var currencySymbol = '$';

    // Date helpers
    Date.prototype.year = function () { return this.getFullYear(); };
    Date.prototype.month = function () { return this.getMonth() + 1; };
    Date.prototype.day = function () { return this.getDate(); };

    // Bind UI to data model
    var template = $('#transaction-template').hide();
    var balanceText = $('#balance');
    var balanceStatus = $('#balance-status');

    var formatAmount = function (number) {
        return (number >= 0 ? '' : '-') + currencySymbol + Math.abs(number).toFixed(2);
    };

    var formatDate = function (date) {
        return date.month() + '/' + date.day();
    }

    var balanceUpdated = function (balance) {
        balanceText.text(formatAmount(balance));

        var statusClass = 'panel-success';
        if (balance < 0) {
            statusClass = 'panel-danger';
        } else if (balance < 50) {
            statusClass = 'panel-warning';
        }
        balanceStatus.removeClass('panel-success panel-warning panel-danger').addClass(statusClass);
    };

    var transactionsUpdated = function (transactions) {
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

            if (amount > 0) {
                entry.addClass('success');
            }
        }
    };

    var showServerError = function () {
        $('#server-error').removeClass('hidden').show();
    };

    // Update from server
    var updateAsync = function () {
        $.ajax({
            type: 'GET',
            url: budgetTrackerCore.summaryPath,
            cache: false,
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
            showServerError();
        });
    };

    // UI interactions
    var addDescription = $('#add-description');
    var addDescriptionGroup = $('#add-description-group');
    var addAmount = $('#add-amount');
    var addAmountGroup = $('#add-amount-group');
    var contributeAmount = $('#contribute-amount');
    var contributeAmountGroup = $('#contribute-amount-group');

    $('#add-form').submit(function (event) {
        event.preventDefault();

        // Validation
        var description = budgetTrackerCore.validateDescription(addDescription.val());
        // TODO: Ignore currency symbols in the input
        var amount = budgetTrackerCore.validateAmount(addAmount.val());

        if (description !== null && amount !== null) {
            // Valid transaction; send it to the server
            $.ajax({
                type: 'POST',
                url: budgetTrackerCore.transactionsPath,
                contentType: "application/json",
                data: JSON.stringify([{
                    description: description,
                    amount: -amount,
                }]),
                success: function () {
                    updateAsync();
                    addDescription.val('');
                    addAmount.val('');
                },
                error: showServerError,
            });
        } else {
            // Highlight validation errors
            if (description === null) {
                addDescriptionGroup.removeClass('has-error');
            } else {
                addDescriptionGroup.addClass('has-error');
            }

            if (amount === null) {
                addAmountGroup.removeClass('has-error');
            } else {
                addAmountGroup.addClass('has-error');
            }
        }
    });

    $('#contribute-form').submit(function (event) {
        event.preventDefault();

        var amount = budgetTrackerCore.validateAmount(contributeAmount.val());
        if (amount !== null) {
            contributeAmountGroup.removeClass('has-error');

            // Valid contribution; send it to the server
            $.ajax({
                type: 'POST',
                url: budgetTrackerCore.transactionsPath,
                contentType: "application/json",
                data: JSON.stringify([{
                    description: 'Contribution',
                    amount: amount,
                }]),
                success: function () {
                    updateAsync();
                    contributeAmount.val('');
                },
                error: showServerError,
            });
        } else {
            contributeAmountGroup.addClass('has-error');
        }
    });

    // Initial state
    updateAsync();

    // TODO: Deleting transactions
    // TODO: Automate monthly addition of funds?
});
