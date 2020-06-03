const JSONStream = require('JSONStream');

const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;

// Database URL
const MongoURL = 'mongodb://localhost:27017';
// Create a new mongo client
const Client = new MongoClient(MongoURL);

// Database Name
const DBName = 'Porichoy';
// Collection Name
const CollectionName = 'Rohan';

var Collection;

// connect to the server
Client.connect(function(err) {

  console.log('Connected successfully to MongoDB Server');

  const DB = Client.db(DBName)
  Collection = DB.collection(CollectionName);
});

app.get('/', function(req, res) {

 Collection.find({})
 .pipe(JSONStream.stringify())
 .pipe(res.type('json'))

});

app.listen(3000, function() {

  console.log('Listening on port 3000');

});