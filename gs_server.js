var express             = require('express'),
    _                   = require('lodash'),
    bodyParser          = require('body-parser'),
    sqlite3             = require('sqlite3'),
    when                = require('when');

var server = express();
var done = false;
var PORT_NAME = process.env.PORT || 8000;

var NUMBER_OF_TOP_SYSTEMS = 10;

server.use(bodyParser.json({ type: "application/json" }));
server.get('/', function(request, response) {
    response.end('Welcome to the Glazing Systems Database!');
});
server.post('/data', function (request, response) {
    var data = request.body;
    response.set('Content-Type', 'application/json');
    if (data.queryType && data.queryType === 'optimization' && data.hasOwnProperty('query')) {
        when(searchTable(data.query)).then(function (rows) {
            response.end(JSON.stringify(_.map(rows, function(row) {
                return _.pick(row, _.keys(data.query).concat('score').concat('ID'));
            })));
        });
    }
    else {
        response.end(JSON.stringify({}));
    }
});

server.listen(PORT_NAME, function() {
    console.log("Working on port " + PORT_NAME);
});

function searchTable(query) {
    var db = new sqlite3.Database('GlazingSystemsDB.sqlite');
    return when.promise(function (resolve, reject) {
        db.serialize(function () {
            db.all("SELECT * FROM GlazingSystems", function (err, rows) {
                if (err) {reject(err);}
                resolve(rows);
            });
        });
    }).then(function (rows) {
        var topRows = [];
        for(var i = 0; i < rows.length; i++) {
            var scoredRow = rows[i];
            if(satisfiesConstraints(scoredRow, query)) {
                scoredRow.score = calculateScore(rows[i], query);
                insertGlazingSystem(scoredRow, topRows);
            }
        }
        return topRows;
    }).catch(function (err) {
        // Log and swallow the error.
        console.error(err);
        return [];
    });
}

function satisfiesConstraints(row, query) {
    return _.all(_.keys(query), function(variable) {
        if(row.hasOwnProperty(variable)) {
            return query[variable].range[0] <= row[variable] && row[variable] <= query[variable].range[1];
        }
        else {
            return false;
        }
    });
}

function calculateScore(row, query) {
    var tot = 0;
    _.each(query, function(val, variable) {
        if(val.weight) {
            tot += val.weight*row[variable];
        }
    });
    return tot;
}

function insertGlazingSystem(gs, topSystems) {
    var ind = _.sortedIndex(topSystems, gs, 'score');
    topSystems.splice(ind, 0, gs);
    if(topSystems.length > NUMBER_OF_TOP_SYSTEMS) {
        topSystems.shift();
    }
}