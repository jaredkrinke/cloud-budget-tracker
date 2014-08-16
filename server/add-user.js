var bcrypt = require('bcryptjs');
var Datastore = require('nedb');
var budgetTrackerCore = require('../common/budget-tracker-core.js');
var namePattern = /^[a-z][a-z0-9]*$/i;

var argv = process.argv;
if (argv.length === 4) {
    var name = argv[2];
    var password = argv[3];

    // TODO: Check to see if the user already exists

    // Validate user name
    if (namePattern.test(name)) {
        // Hash the password
        var hashedPassword = bcrypt.hashSync(password);

        // Load from the database
        var db = new Datastore({ filename: __dirname + budgetTrackerCore.userDatabaseName, });
        db.loadDatabase(function (err) {
            if (err) {
                console.log('Error loading database!');
                console.log(err);
            } else {
                console.log('Inserting user: %s...', name);
                var document = {
                    _id: name.toLowerCase(),
                    nameDisplay: name,
                    password: hashedPassword,
                };

                db.insert(document, function (err, document) {
                    console.log(document);
                });
            }
        });
    } else {
        console.log('Invalid user name: %s', name);
    }
} else {
    console.log('USAGE: <User Name> <Password>');
}
