/************************************************************************
 * MQTT Client
 ************************************************************************/
var mqtt = require('mqtt');
const fs = require('fs');

var mqttClient = mqtt.connect("mqtt://142.93.62.203", {clientId: "Porichoy-HTTP_Server"});

mqttClient.on("connect", function(){

  console.log("connected to MQTT Broker");
  mqttClient.subscribe("Image");
  mqttClient.subscribe("Result");
});

mqttClient.on("error", function(error) {

  console.log("Can't connect " + error);
  process.exit(1);
});

var Callback_Requested = false;
var Callback1_Handled = false;
var Callback2_Handled = false;

mqttClient.on("message", function(topic, message) {

  console.log("Message Arrived. Topic: " + topic);

  if (!Callback_Requested)
  {
    console.log("No callback requested. Discarded");
    return;
  }

  switch (topic)
  {
    case 'Image':
      return handleImageReceived(message);
    
    case 'Result':
      return handleResponse(message);
  }

});

let file = 'public/temp.jpg'

function handleImageReceived (message)
{
  fs.writeFile(file, message, (err) => {
    if (err) throw err;

    console.log('File Saved: ' + file);
    
    Callback1_Handled = true;
  });

};

var Result = "";

function handleResponse(message)
{
  if (message.includes('NO MATCH'))
    Result = 'NO MATCH'
  else
    Result = message.slice(9);

  console.log('Result = ' + Result);

  Callback2_Handled = true;
}

/************************************************************************
 * MongoDB Connection
 ************************************************************************/
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

/************************************************************************
 * Express app
 ************************************************************************/
const JSONStream = require('JSONStream');

const express = require('express');
const app = express();

const path = require('path');

const ejs = require('ejs');

app.set('view engine', 'ejs');

app.use (express.static(path.join(__dirname, "public")));


app.get('/', (req, res) => {

  res.sendFile(path.join(__dirname + '/public/actions.html'));
});


app.get('/ViewDatabase', function(req, res) {

 Collection.find({})
 .pipe(JSONStream.stringify())
 .pipe(res.type('json'))

});


app.get('/Controls', (req, res) => {

  res.sendFile(path.join(__dirname + '/public/controls.html'));
});


app.get('/Controls/AutoOn', (req, res) => {

  mqttClient.publish('Control', '010100');
  res.sendFile(path.join(__dirname + '/public/controls.html'));
});


app.get('/Controls/AutoOff', (req, res) => {

  mqttClient.publish('Control', '010000');
  res.sendFile(path.join(__dirname + '/public/controls.html'));
});



app.use("/Controls/Capture", (req, res, next) => {

  Callback_Requested = true;

  mqttClient.publish('Control', '020000');

  setTimeout(() => { next();}, 5000);
  
});

app.get('/Controls/Capture', (req, res) => {

  if (Callback1_Handled === false)
    res.send("Error Capturing Image. Please try again later");
    
  else
  {
    res.sendFile(path.join(__dirname + '/public/controls_img.html'), function(err) {
      
      if (err)
        console.log(err);
      
      // delete the file after a few seconds
      setTimeout(() => 
      {
          try {
            fs.unlinkSync(file)
            //file removed
          } catch(err) {
            console.error(err) } 
      }, 5000);

    });
  }

  Callback1_Handled   = false;
  Callback_Requested  = false;
});



app.use('/Controls/CaptureRecognize', (req, res, next) => {

  Callback_Requested = true;

  mqttClient.publish('Control', '020100');

  setTimeout(() => { next();}, 8000);
});


app.get('/Controls/CaptureRecognize', (req, res) => {

  //TODO: Delete the image file
  
  if (!Callback1_Handled || !Callback2_Handled)
    res.send("Error Capturing Image. Please try again later");

  else
    res.render(path.join(__dirname + '/public/controls_img_recog'), {data: {Response: Result }});


  Callback1_Handled   = false;
  Callback2_Handled   = false;
  Callback_Requested  = false;
  
});


app.listen(3000, function() {

  console.log('Listening on port 3000');
});