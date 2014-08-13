var needle = require('needle');
var requests = [
    {
        method: 'get',
    },
    {
        method: 'post',
        params: {
            description: 'Testing this "thing" out!',
            amount: '5.56',
        },
    },
    {
        method: 'get',
    },
    {
        method: 'post',
        params: {
            description: 'Should fail...',
            amount: 'a',
        },
    },
];

var processRequests = function (requests) {
    if (requests.length > 0) {
        var request = requests[0];
        needle.request(request.method, 'http://localhost:8888/api', request.params, { multipart: true }, function (error, response) {
            if (error) {
                console.log('ERROR:');
                console.log(error);
            }
            if (response) {
                console.log('Status: ' + response.statusCode);
            }

            processRequests(requests.slice(1));
        });
    }
};

processRequests(requests);
