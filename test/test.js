// Stream from a string
var Readable = require('stream').Readable;
var util = require('util');
util.inherits(StringStream, Readable);

function StringStream(content) {
    Readable.call(this, { encoding: 'utf8' });
    this.content = content;
    this.done = false;
}

StringStream.prototype._read = function () {
    this.push(this.done ? null : this.content);
};

// Test requests
var needle = require('needle');
var requests = [
    // Test transactions
    {
        method: 'get',
        url: '/api/transactions',
    },
    {
        method: 'post',
        url: '/api/transactions',
        data: {
            description: 'Testing this "thing" out!',
            amount: '5.56',
        },
    },
    {
        method: 'get',
        url: '/api/transactions',
    },
    {
        method: 'post',
        url: '/api/transactions',
        data: {
            description: 'Should fail...',
            amount: 'a',
        },
    },
    {
        method: 'post',
        url: '/api/transactions',
        data: new StringStream('{Also fail!!!"' + "'"),
    },

    // Test contributions
    {
        method: 'post',
        url: '/api/contributions',
        data: {
            amount: '100',
        },
    },
    {
        method: 'get',
        url: '/api/transactions',
    },
    {
        method: 'post',
        url: '/api/contributions',
        data: new StringStream('{Also fail!!!"' + "'"),
    },
];

var processRequests = function (requests) {
    if (requests.length > 0) {
        var request = requests[0];
        needle.request(
            request.method,
            'http://localhost:8888' + request.url,
            request.data,
            { json: false },
            function (error, response, body) {
                if (error) {
                    console.log('ERROR:');
                    console.log(error);
                }
                if (response) {
                    console.log('Status: ' + response.statusCode);
                    console.log(body);
                }

                processRequests(requests.slice(1));
            }
        );
    }
};

processRequests(requests);
