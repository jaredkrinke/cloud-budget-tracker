var needle = require('needle');
var requests = [
    {
        method: 'get',
    },
    {
        method: 'post',
        data: {
            description: 'Testing this "thing" out!',
            amount: '5.56',
        },
    },
    {
        method: 'get',
    },
    {
        method: 'post',
        data: {
            description: 'Should fail...',
            amount: 'a',
        },
    },
    {
        method: 'post',
        // TODO: How to make this the exact body that is passed (to verify JSON parsing)?
        data: '{Also fail!!!"' + "'",
    },
];

var processRequests = function (requests) {
    if (requests.length > 0) {
        var request = requests[0];
        needle.request(
            request.method,
            'http://localhost:8888/api',
            request.data,
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
