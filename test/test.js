var http = require('http');
http.get('http://localhost:8888/api', function (response) {
    console.log('Status: ' + response.statusCode);
    response.pipe(process.stdout);
});
