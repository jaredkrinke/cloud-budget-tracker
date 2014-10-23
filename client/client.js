$(function () {
    // Constants
    var currencySymbol = '$';
    var lastServerDataKey = 'lastServerDataV2';
    var unsyncedTransactionsKey = 'unsyncedTransactionsV2';

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

    // Online/offline visual state
    var serverOffline = $('#server-offline').hide();
    var online = true;
    var setOnlineStatus = function (newOnline) {
        if (online !== newOnline) {
            online = newOnline;
            var serverOffline = $('#server-offline');
            if (online) {
                serverOffline.slideUp();
            } else {
                serverOffline.slideDown();
            }
        }
    };
    var setOnline = function () { setOnlineStatus(true); }
    var setOffline = function () { setOnlineStatus(false); }

    // Online/offline triggers
    var detectOnlineStatus = function () {
        if (navigator && navigator.onLine !== undefined) {
            return navigator.onLine;
        }
        return true;
    };
    window.addEventListener('online', detectOnlineStatus, false);
    window.addEventListener('offline', detectOnlineStatus, false);

    // Check online status
    detectOnlineStatus();

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

    var defaultCategory = 'Default';
    var createEmptyData = function () {
        return {
            categories: {}
        };
    };

    var retrieveLastServerData = function () {
        var json = localStorage[lastServerDataKey];
        if (json) {
            try {
                var data = JSON.parse(json);
                var categories = data.categories;
                for (var categoryName in categories) {
                    var transactions = categories[categoryName].transactions;
                    for (var i = 0, count = transactions.length; i < count; i++) {
                        var transaction = transactions[i];
                        if (transaction.date) {
                            transaction.date = new Date(transaction.date);
                        }
                    }
                }

                return data;
            } catch (e) { }
        }
        return createEmptyData();
    };
    var storeLastServerData = function (data) {
        localStorage[lastServerDataKey] = JSON.stringify(data);
    };

    var retrieveAndMergeData = function () {
        // Get the server data
        var data = retrieveLastServerData();

        // Get the client data
        var unsyncedTransactions = retrieveUnsyncedTransactions();

        // Merge them
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

    var compareData = function (a, b) {
        // Check set of categories first
        var keys = [];
        var ak = a.categories;
        var bk = b.categories;
        for (var key in ak) {
            if (!(key in bk)) {
                return false;
            }
            keys[key] = true;
        }

        for (var key in bk) {
            if (!(key in ak)) {
                return false;
            }
            keys[key] = true;
        }

        // Now compare the contents of each category
        for (var key in keys) {
            var ac = ak[key];
            var bc = bk[key];
            if (ac.balance !== bc.balance) {
                return false;
            }

            var ta = ac.transactions;
            var tb = bc.transactions;

            if (ta.length !== tb.length) {
                return false;
            }

            var count = ta.length;
            for (var i = 0; i < count; i++) {
                var x = ta[i];
                var y = tb[i];
                if (x.amount !== y.amount || x.description !== y.description) {
                    return false;
                }
                var dx = x.date;
                var dy = y.date;
                if (dx.year() !== dy.year() || dx.month() !== dy.month() || dx.day() !== dy.day()) {
                    return false;
                }
            }
        }

        return true;
    };

    var lastData = createEmptyData();
    var updateUI = function () {
        var data = retrieveAndMergeData();

        // Only update the UI if something's changed
        if (!compareData(data, lastData)) {
            var category = data.categories[defaultCategory];
            balanceUpdated(category ? category.balance : 0);
            transactionsUpdated(category ? category.transactions : []);
            lastData = data;
        }
    };

    var addNewTransaction = function (description, amount) {
        // Store locally first
        var unsyncedTransactions = retrieveUnsyncedTransactions();
        unsyncedTransactions.push({
            category: defaultCategory,
            description: description,
            amount: amount
        });
        storeUnsyncedTransactions(unsyncedTransactions);

        // Update the UI based on local data (although it may update again later if we sync in a remote change)
        updateUI();

        // Now attempt to sync with the server
        syncData();
    };

    var loadAndDisplayServerData = function () {
        $.ajax({
            type: 'GET',
            url: budgetTrackerCore.summaryPath,
            cache: false,
            dataType: 'json'
        }).done(function (serverData) {
            var categories = serverData.categories;
            for (var categoryName in categories) {
                var transactions = categories[categoryName].transactions;

                // Parse dates
                for (var i = 0, count = transactions.length; i < count; i++) {
                    var transaction = transactions[i];
                    transaction.date = new Date(transaction.date);
                }
            }

            // Store new state from the server
            storeLastServerData(serverData);

            // Update UI
            setOnline();
            updateUI();
        }).error(setOffline);
    };

    var syncData = function () {
        // TODO: A progress indicator would be nice...
        var unsyncedTransactions = retrieveUnsyncedTransactions();
        if (unsyncedTransactions.length > 0) {
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
                error:setOffline
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
