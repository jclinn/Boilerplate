//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var dotenv = require('dotenv');
dotenv.load();

var fb_client_id = process.env.client_id;
var fb_client_secret = process.env.client_secret;
var fb_scope = process.env.scope_permission;
var fb_redirect_url = process.env.redirect_url;
var token;
var graph = require('fbgraph');
var app = express();

// variables for fb connection:
var conf = {
	client_id: fb_client_id
	,client_secret: fb_client_secret
	,scope: fb_scope
	, redirect_uri: fb_redirect_url
};

// configuration:

//route files to load
var index = require('./routes/index');

//database setup - uncomment to set up your database
//var mongoose = require('mongoose');
//mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/DATABASE1);

//Configures the Template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());

//routes
app.get('/', index.view);

app.get('/auth/facebook', function(req, res) {

  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     conf.client_id
      , "redirect_uri":  conf.redirect_uri
      , "scope":         conf.scope
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }


// code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      conf.client_id
    , "redirect_uri":   conf.redirect_uri
    , "client_secret":  conf.client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
  	//console.log("auth code: " + req.query.code);
  	token = req.query.code;
    res.redirect('/UserHasLoggedIn');
  });


});



var statusData = {};
var dataOutside = {};
var fbName = "Not Logged In";
var fbLikes = {};
// user gets sent here after being authorized
app.get('/UserHasLoggedIn', function(req, res) {
	token = graph.getAccessToken();
	//console.log(" access token: " + token);

	//get basic user info
	graph.get("/me", function(err, res) {
		//console.log("name: " + res.name);
		fbName = res.name;
	})

	//console.log("fbname outside: " + fbName);

	//get fb status
	graph.get("/me/statuses?fields=message", function(err, res) {
		//console.log(res);
		//statusData = res;
		//console.log("length: " + res.data.length);
		for( var i = 0; i < res.data.length; i++) {
			//console.log("object: " + res.data[i].message);
			statusData[i] = res.data[i].message;
		}
	//	console.log(" statusDAta: " + statusData[0]);
		dataOutside = res;
	});
	//console.log(" statusDAta: " + statusData[0]);
	//statusData[0] = "Why you don't work?";
	//console.log(" statusDAta: " + statusData[0]);
	//console.log(" status Outside: " + dataOutside.data[0].message);
	//res.render("index", data: 'data');

	// get fb likes)
	graph.get("/me/likes", function(err, res) {
		//console.log(res);
		fbLikes = res;
		//console.log("fb likes: " + fbLikes.data[0].name);
	});
	//console.log("fb likes outside " + fbLikes);
	//console.log("fb likes example outside " + fbLikes.data[0].name);
	res.redirect('/pull');
});

//console.log("token value: " + token);

app.get('/pull', function(err, res) {
setTimeout(function() { // allow callbacks to return from asynchronous call
	  res.render("index", { title: "Logged In", 
  						button: "LOG OUT OF FACEBOOK", 
  						status_list: dataOutside.data, 
  						name: fbName,
  						likes_list: fbLikes.data });
	  }, 10000);
});



//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});