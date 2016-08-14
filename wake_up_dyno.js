var http = require('http'); //importing http

var options_1 = {
    host: 'warm-hamlet-26182.herokuapp.com',
    port: 80,
    path: '/crawl'
};

var options_2 = {
    host: 'shrouded-bayou-32204.herokuapp.com',
    port: 80,
    path: '/crawl'
};

console.log("======WAKUP DYNO START: BitTiger Geek Ranking Board");
http.get(options_1, function (res) {
    res.on('data', function (chunk) {
        try {
            // optional logging... disable after it's working
            console.log("======WAKUP DYNO: HEROKU RESPONSE: " + chunk);
        } catch (err) {
            console.log(err.message);
        }
    });
}).on('error', function (err) {
    console.log("Error: " + err.message);
});

console.log("======WAKUP DYNO START: BitTiger Project Geek Ranking Board");
http.get(options_2, function (res) {
    res.on('data', function (chunk) {
        try {
            // optional logging... disable after it's working
            console.log("======WAKUP DYNO: HEROKU RESPONSE: " + chunk);
        } catch (err) {
            console.log(err.message);
        }
    });
}).on('error', function (err) {
    console.log("Error: " + err.message);
});
