const sqlite3 = require('sqlite3');
const { existsSync, mkdirSync } = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();

app.use(cors());
app.use(bodyParser.json())


//! Init database
var dir = "./db";
if (!existsSync(dir)) {
    mkdirSync(dir);
}
let db = new sqlite3.Database("./db/database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("connected to Reminder db");
    //* creates table for reminders
    db.run(/*sql*/`CREATE TABLE IF NOT EXISTS "PolyLine" ("GeoJSON" TEXT NOT NULL)`, function (err) {
        if (err) {
            console.error(err.message);
        }
    });
});

app.post('/polyline', function (req, res) {
    console.log("fetched");
    // get sent data
    console.log(req.body);
    var input = req.body;
    // insert
    db.run(/*sql*/`INSERT INTO PolyLine VALUES (?)`, [input['polyline']]);
    res.end('Success');
});

app.listen(3333, function () { console.log("listening on 3333"); });