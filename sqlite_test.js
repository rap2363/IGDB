var express             = require('express'),
    _                   = require('lodash'),
    bodyParser          = require('body-parser'),
    sqlite3             = require('sqlite3'),
    when                = require('when');

var server = express();
var done = false;
var PORT_NAME = process.env.PORT || 8000;

server.use(bodyParser.json({ type: "application/json" }));

server.post('/data', function (request, response) {
    var data = request.body;
    response.set('Content-Type', 'application/json');
    if (data.queryType) {
        if (data.queryType === 'spectralProperties' && data.hasOwnProperty('query') && !isNaN(filterInt(data.query))) {
            when(queryDatabase(filterInt(data.query))).then(function (rows) {
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
        else {
            response.end(JSON.stringify({
                GlazingID: data.query,
                Wavelengths: [],
                T: [],
                Rf: [],
                Rb: []
            }));
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
    var db = new sqlite3.Database('Glazing_test.sqlite');
    return when.promise(function (resolve, reject) {
        db.serialize(function() {
            var allRows = [];
            db.all("SELECT * FROM SpectralData WHERE GlazingID="+query, function(err, rows) {
                if (err) {reject(err);}
                resolve(rows);
            });
        });
    });
}