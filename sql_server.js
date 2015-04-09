var express             = require('express'),
    _                   = require('lodash'),
    bodyParser          = require('body-parser'),
    sqlite3             = require('sqlite3'),
    when                = require('when');

var server = express();
var done = false;
var PORT_NAME = process.env.PORT || 8000;

server.use(bodyParser.json({ type: "application/json" }));
server.get('/', function(request, response) {
    response.end('Welcome to the International Glazing Database!');
});
server.post('/data', function (request, response) {
    var data = request.body;
    response.set('Content-Type', 'application/json');
    if (data.queryType) {
        if (data.queryType === 'spectralProperties' && data.hasOwnProperty('query') && !isNaN(filterInt(data.query))) {
            when(querySpectralProperties(filterInt(data.query))).then(function (rows) {
                var responseData = {
                    GlazingID: data.query,
                    Wavelengths: _.pluck(rows, 'Wavelength'),
                    T: _.pluck(rows, 'T'),
                    Rf: _.pluck(rows, 'Rf'),
                    Rb: _.pluck(rows, 'Rb')
                };
                response.end(JSON.stringify(responseData));
            });
        }
        else if (data.queryType === 'generalQuery' && data.hasOwnProperty('query')) {
            when(queryDatabase(data.query)).then(function (rows) {
                response.end(JSON.stringify(rows));
            }, function() {
                response.end(JSON.stringify({}));
            });
        }
        else {
            response.end(JSON.stringify({}));
        }
    }
    else {
        response.end(JSON.stringify({}));
    }
});

server.listen(PORT_NAME, function() {
    console.log("Working on port " + PORT_NAME);
});

function filterInt(value) {
  if(/([0-9])$/.test(value))
    return parseInt(value);
  return NaN;
}

function queryDatabase(query) {
    var db = new sqlite3.Database('GlazingDB.sqlite');
    return when.promise(function (resolve, reject) {
        db.serialize(function() {
            db.all("SELECT "+query[0]+" FROM "+query[1]+" WHERE "+query[2], function(err, rows) {
                if (err) {reject(err);}
                resolve(rows);
            });
        });
    });
}

function querySpectralProperties(query) {
    var db = new sqlite3.Database('GlazingDB.sqlite');
    return when.promise(function (resolve, reject) {
        db.serialize(function() {
            db.all("SELECT * FROM SpectralData WHERE GlazingID="+query, function(err, rows) {
                if (err) {reject(err);}
                resolve(rows);
            });
        });
    });
}