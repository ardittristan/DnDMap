const sqlite3 = require('sqlite3');
const { existsSync, mkdirSync } = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());


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
    //* creates table for reminders
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "PolyLine" ("LatLng" TEXT NOT NULL, "Text" TEXT)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Circle" ("LatLng" TEXT NOT NULL, "Radius" INTEGER NOT NULL, "Text" TEXT)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "Marker" ("LatLng" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
});

//! Receive creation notices
app.post('/polyline', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO PolyLine VALUES (?, ?)`, [input['latlng'], null]);
    res.end('Success');
});
app.post('/circle', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO Circle VALUES (?, ?, ?)`, [input['latlng'], input['radius'], null]);
    res.end('Success');
});
app.post('/marker', function (req, res) {
    // get sent data
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO Marker VALUES (?)`, [input['latlng']]);
    res.end('Success');
});


//! Receive deletion notices
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
                    db.run(/*sql*/`DELETE FROM PolyLine WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

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
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    db.run(/*sql*/`DELETE FROM Circle WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});
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
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    db.run(/*sql*/`DELETE FROM Marker WHERE _rowid_ = (?)`, [row.id]);
                    res.end('Success');
                }
            });
        }
    });
});


//! Load old objects
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
            if (rows.length != 0) {
                rows.forEach(function (row) {
                    var text = ""
                    if (!(row.Text === null || row.Text === "")) {
                        text = row.Text
                    }
                    output.polyline.push({coordinates: row.LatLng, text: text});
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
            if (rows.length != 0) {
                rows.forEach(function (row) {
                    var text = ""
                    if (!(row.Text === null || row.Text === "")) {
                        text = row.Text
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
            if (rows.length != 0) {
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
                    db.run(/*sql*/`UPDATE PolyLine SET "Text" = (?) WHERE _rowid_ = (?)`, [input['text'], row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

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
                var arrayInput = await JSON.parse(input['latlng']);
                var arrayRow = await JSON.parse(row.LatLng);
                var inputX = (Math.round(arrayInput.x * 10000000)) / 10000000;
                var inputY = (Math.round(arrayInput.y * 10000000)) / 10000000;
                var rowX = (Math.round(arrayRow.x * 10000000)) / 10000000;
                var rowY = (Math.round(arrayRow.y * 10000000)) / 10000000;
                if (inputX === rowX && inputY === rowY) {
                    db.run(/*sql*/`UPDATE Circle SET "Text" = (?) WHERE _rowid_ = (?)`, [input['text'], row.id]);
                    res.end('Success');
                }
            });
        }
    });
});

app.listen(3333, function () { console.log("listening on 3333"); });