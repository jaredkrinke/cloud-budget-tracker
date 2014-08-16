var bcrypt = require('bcryptjs');
var Datastore = require('nedb');
var userPattern = /^[a-z][a-z0-9]*$/i;

var argv = process.argv;
if (argv.length === 4) {
    var user = argv[2];
    var password = argv[3];

    // Validate user name
    if (userPattern.test(user)) {
        // Hash the password
        var hashedPassword = bcrypt.hashSync(password);

        // Load from the database
        var db = new Datastore({ filename: __dirname + '/users.db', });
        db.loadDatabase(function (err) {
            if (err) {
                console.log('Error loading database!');
                console.log(err);
            } else {
                console.log('Inserting user: %s...', user);
                var document = {
                    user: user.toLowerCase(),
                    userDisplay: user,
                    password: hashedPassword,
                };

                db.insert(document, function (err, document) {
                    console.log(document);
                });
            }
        });
    } else {
        console.log('Invalid user name: %s', user);
    }
} else {
    console.log('USAGE: <User> <Password>');
}
