//! init dependencies
const sqlite3 = require('sqlite3');
const { existsSync, mkdirSync } = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const https = require('https');
const fs = require('fs');
const port = 3333;

//* init https
var cert = fs.readFileSync('./cert/cert.crt');
var key = fs.readFileSync('./cert/private.key');
var options = {
    key: key,
    cert: cert
};

//* add cors and bodyparser to express
app.use(cors());
app.use(bodyParser.json({ limit: "50mb", extended: true, parameterLimit: 500000000 }));


//! Init database
const dir = "./db";
if (!existsSync(dir)) {
    mkdirSync(dir);
}
let db = new sqlite3.Database("./db/database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("connected to Reminder db");
    //* creates table for polylines
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "PolyLine" ("LatLng" TEXT NOT NULL, "Text" TEXT)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for circles
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Circle" ("LatLng" TEXT NOT NULL, "Radius" INTEGER NOT NULL, "Text" TEXT)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for markers
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Marker" ("LatLng" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    //* creates table for map text markers
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "TextOverlay" ("Name" TEXT, "LatLng" TEXT NOT NULL, "Image" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
});


//! Receive creation notices

//* when polyline created
app.post('/polyline', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO PolyLine VALUES (?, ?)`, [input['latlng'], null]);
    res.end('Success');
});

//* when circle created
app.post('/circle', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO Circle VALUES (?, ?, ?)`, [input['latlng'], input['radius'], null]);
    res.end('Success');
});

//* when marker created
app.post('/marker', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO Marker VALUES (?)`, [input['latlng']]);
    res.end('Success');
});


//! Receive deletion notices

//* when polyline deleted
app.post('/deletepolyline', async function (req, res) {
    // get sent data
    var input = req.body;
    let sql = /*sql*/`SELECT    LatLng,
                                _rowid_ id
                        FROM PolyLine
                        ORDER BY _rowid_`;
    db.all(sql, [], async (err, rows) => {
        if (err) {
            res.end('Failure');
        }
        else {
            var inputObj = await JSON.parse(input['latlng']);
            rows.forEach(async function (row) {
                var same = true;
                var rowArray = await JSON.parse(row.LatLng);
                rowArray.forEach(function (arrayRow, index) {
                    // check if input is the same as current row
                    var arrayInput = inputObj[index];
                    var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                    var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                    var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                    var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                    if (!(inputX === rowX && inputY === rowY)) {
                        same = false;
                    }
                });
                if (same) {
                    // deletes the row if previous statement succeeded
                    db.run(/*sql*/`DELETE FROM PolyLine WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

//* when circle deleted
app.post('/deletecircle', async function (req, res) {
    // get sent data
    var input = req.body;
    let sql = /*sql*/`SELECT    LatLng,
                                _rowid_ id
                        FROM Circle
                        ORDER BY _rowid_`;
    db.all(sql, [], async (err, rows) => {
        if (err) {
            res.end('Failure');
        }
        else {
            rows.forEach(async function (row) {
                // check if input is the same as current row
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    // deletes the row if previous statement succeeded
                    db.run(/*sql*/`DELETE FROM Circle WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

//* when marker deleted
app.post('/deletemarker', function (req, res) {
    // get sent data
    var input = req.body;
    let sql = /*sql*/`SELECT    LatLng,
                                _rowid_ id
                        FROM Marker
                        ORDER BY _rowid_`;
    db.all(sql, [], async (err, rows) => {
        if (err) {
            res.end('Failure');
        }
        else {
            rows.forEach(async function (row) {
                // check if input is the same as current row
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    // deletes the row if previous statement succeeded
                    db.run(/*sql*/`DELETE FROM Marker WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});


//! Load old objects

//* when polyline fetched
app.get('/fetchpolyline', function (_, res) {
    var output = { polyline: [] };
    let sql = /*sql*/`SELECT    LatLng,
                                Text
                        FROM PolyLine
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.send(JSON.stringify(output));
            res.end("Failure");
        }
        else {
            // checks if there are any polylines
            if (rows.length != 0) {
                // adds each row to output
                rows.forEach(function (row) {
                    var text = "";
                    if (!(row.Text === null || row.Text === "")) {
                        text = row.Text;
                    }
                    output.polyline.push({ coordinates: row.LatLng, text: text });
                });
                res.send(JSON.stringify(output));
                res.end("Success");
            }
            else {
                res.send(JSON.stringify(output));
                res.end("Success");
            }
        }
    });
});

//* when circle fetched
app.get('/fetchcircle', function (_, res) {
    var output = { circle: [] };
    let sql = /*sql*/`SELECT    LatLng,
                                Radius,
                                Text
                        FROM Circle
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.send(JSON.stringify(output));
            res.end("Failure");
        }
        else {
            // checks if there are any circles
            if (rows.length != 0) {
                // adds each row to output
                rows.forEach(function (row) {
                    var text = "";
                    if (!(row.Text === null || row.Text === "")) {
                        text = row.Text;
                    }
                    output.circle.push({ latlng: row.LatLng, radius: row.Radius, text: text });
                });
                res.send(JSON.stringify(output));
                res.end("Success");
            }
            else {
                res.send(JSON.stringify(output));
                res.end("Success");
            }
        }
    });
});

//* when marker fetched
app.get('/fetchmarker', function (_, res) {
    var output = { marker: [] };
    let sql = /*sql*/`SELECT    LatLng
                        FROM Marker
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.send(JSON.stringify(output));
            res.end("Failure");
        }
        else {
            // check if there are any markers
            if (rows.length != 0) {
                // adds each marker to output
                rows.forEach(function (row) {
                    output.marker.push(row.LatLng);
                });
                res.send(JSON.stringify(output));
                res.end("Success");
            }
            else {
                res.send(JSON.stringify(output));
                res.end("Success");
            }
        }
    });
});


//! editing of objects

//* when polyline edited
app.post('/editpolyline', async function (req, res) {
    // get sent data
    var input = req.body;
    let sql = /*sql*/`SELECT    LatLng,
                                _rowid_ id
                        FROM PolyLine
                        ORDER BY _rowid_`;
    db.all(sql, [], async (err, rows) => {
        if (err) {
            res.end('Failure');
        }
        else {
            var inputObj = await JSON.parse(input['latlng']);
            rows.forEach(async function (row) {
                var same = true;
                var rowArray = await JSON.parse(row.LatLng);
                rowArray.forEach(function (arrayRow, index) {
                    // check if input is the same as current row
                    var arrayInput = inputObj[index];
                    var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                    var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                    var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                    var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                    if (!(inputX === rowX && inputY === rowY)) {
                        same = false;
                    }
                });
                if (same) {
                    // deletes the row if previous statement succeeded
                    db.run(/*sql*/`UPDATE PolyLine SET "Text" = (?) WHERE _rowid_ = (?)`, [input['text'], row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

//* when circle edited
app.post('/editcircle', async function (req, res) {
    // get sent data
    var input = req.body;
    let sql = /*sql*/`SELECT    LatLng,
                                _rowid_ id
                        FROM Circle
                        ORDER BY _rowid_`;
    db.all(sql, [], async (err, rows) => {
        if (err) {
            res.end('Failure');
        }
        else {
            rows.forEach(async function (row) {
                // check if input is the same as current row
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    // deletes the row if previous statement succeeded
                    db.run(/*sql*/`UPDATE Circle SET "Text" = (?) WHERE _rowid_ = (?)`, [input['text'], row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

//! text overlays
//* receive new text
app.post('/addtext', async function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO TextOverlay VALUES (?, ?, ?)`, [input['name'], input['latlng'], input['image']]);
    res.end('Success');
});

//* when text fetched
app.get('/fetchtext', function (_, res) {
    var output = { text: [] };
    let sql = /*sql*/`SELECT    LatLng,
                                Image
                        FROM TextOverlay
                        ORDER BY _rowid_`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.send(JSON.stringify(output));
            res.end("Failure");
        }
        else {
            // checks if there are any texts
            if (rows.length != 0) {
                // adds each row to output
                rows.forEach(function (row) {
                    output.text.push({ latlng: row.LatLng, image: row.Image });
                });
                res.send(JSON.stringify(output));
                res.end("Success");
            }
            else {
                res.send(JSON.stringify(output));
                res.end("Success");
            }
        }
    });
});

//! starts listening on port 3333
var server = https.createServer(options, app);
server.listen(port, () => {
    console.log(`listening on ${port}`);
});

//! database cleaning
async function dbVacuum() {
    db.run(/*sql*/`VACUUM "main"`);
}
dbVacuum;
setInterval(dbVacuum, 86400000);