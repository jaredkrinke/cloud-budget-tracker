$(function () {
    // Constants
    var currencySymbol = '$';
    // TODO: Store these in a single "lastServerData" object?
    var lastServerBalanceKey = 'lastServerBalance';
    var lastServerTransactionsKey = 'lastServerTransactions';
    var unsyncedTransactionsKey = 'unsyncedTransactions';

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

    // Server communication
    // TODO: Automatically go online/offline (and sync as needed)
    // TODO: Animation
    var setOnline = function () { $('#server-offline').addClass('hidden'); }
    var setOffline = function () { $('#server-offline').removeClass('hidden'); }

    // Store/retrieve data from local storage
    var retrieveUnsyncedTransactions = function () {
        var text = localStorage[unsyncedTransactionsKey];
        if (text) {
            try {
                return JSON.parse(text);
            } catch (e) { }
        }
        return [];
    };
    var storeUnsyncedTransactions = function (unsyncedTransactions) {
        localStorage[unsyncedTransactionsKey] = JSON.stringify(unsyncedTransactions);
    };

    var retrieveLastServerBalance = function () {
        return +localStorage[lastServerBalanceKey] || 0;
    };
    var storeLastServerBalance = function (balance) {
        localStorage[lastServerBalanceKey] = balance;
    };

    var retrieveTransactions = function () {
        var transactionsJSON = localStorage[lastServerTransactionsKey];
        var transactions;
        if (transactionsJSON) {
            try {
                var transactions = JSON.parse(transactionsJSON);
                for (var i = 0, count = transactions.length; i < count; i++) {
                    var transaction = transactions[i];
                    if (transaction.date) {
                        transaction.date = new Date(transaction.date);
                    }
                }

                return transactions;
            } catch (e) { }
        }
        return [];
    };
    var storeLastServerTransactions = function (transactions) {
        localStorage[lastServerTransactionsKey] = JSON.stringify(transactions);
    };

    var retrieveAndMergeData = function () {
        // Get the server data
        var serverBalance = retrieveLastServerBalance();
        var serverTransactions = retrieveTransactions();

        // Get the client data
        var unsyncedTransactions = retrieveUnsyncedTransactions();

        // Merge them
        var data = {
            balance: serverBalance,
            transactions: serverTransactions,
        };
        var count = unsyncedTransactions.length;
        for (var i = 0; i < count; i++) {
            var unsyncedTransaction = unsyncedTransactions[i];
            // Assume unsynced transactions are new
            // TODO: Use a date other than the current date
            unsyncedTransaction.date = new Date();
            budgetTrackerCore.addTransaction(data, unsyncedTransaction);
        }

        return data;
    }

    var updateUI = function () {
        var data = retrieveAndMergeData();
        // TODO: Optimizations (e.g. checking for changes)
        balanceUpdated(data.balance);
        transactionsUpdated(data.transactions);
    };

    var addNewTransaction = function (description, amount) {
        // Store locally first
        var unsyncedTransactions = retrieveUnsyncedTransactions();;
        unsyncedTransactions.push({
            description: description,
            amount: amount
        });
        storeUnsyncedTransactions(unsyncedTransactions);

        // TODO: Could update the UI here...

        // Now attempt to sync with the server
        syncData();
    };

    var loadAndDisplayServerData = function () {
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

            // Store new state from the server
            storeLastServerBalance(balance);
            storeLastServerTransactions(transactions);

            // Update UI
            setOnline();
            updateUI();
        }).error(function () {
            setOffline();

            // There was a server error, so show what we have locally
            // TODO: Maybe update earlier on than this?
            updateUI();
        });
    };

    var syncData = function () {
        var unsyncedTransactions = retrieveUnsyncedTransactions();
        if (unsyncedTransactions.length > 0) {
            // TODO: Update view even in case of failure!
            $.ajax({
                type: 'POST',
                url: budgetTrackerCore.transactionsPath,
                contentType: "application/json",
                data: JSON.stringify(unsyncedTransactions),
                success: function () {
                    // Transactions have been synced, so delete them
                    storeUnsyncedTransactions([]);
                    loadAndDisplayServerData();
                    setOnline();
                },
                error: function () {
                    setOffline();

                    // There was a server error, so just update the UI locally
                    updateUI();
                },
            });
        } else {
            // Check for an update on the server side
            loadAndDisplayServerData();
        }
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
            // Valid transaction; save it
            addNewTransaction(description, -amount);
            addDescription.val('');
            addAmount.val('');
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

            // Valid contribution; save it
            addNewTransaction('Contribution', amount);
            contributeAmount.val('');
        } else {
            contributeAmountGroup.addClass('has-error');
        }
    });

    // Load and display the most recently synced data
    updateUI();

    // Kick off a sync
    syncData();

    // TODO: Deleting transactions
    // TODO: Automate monthly addition of funds?
});
