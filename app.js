//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var dotenv = require('dotenv');
var oauth = require('oauth');
var util = require('util');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
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

// variables for twitter
var Twit = require('twit');

var T = new Twit({
    consumer_key:         'M5fthvJjAiMD0ka4MaTOCcJ33'
  , consumer_secret:      'DMkGty3P3VXtja20UJpfKmh5CxKR51QrBJrzLsxYllnkFQhSS2'
  , access_token:         '149544878-RJLfEPqhdm48g9Yj9gcuyqAoHixFMEgsiBLDoWZa'
  , access_token_secret:  '07VT9qkRJwuXLRar5ibVLTcK03jfPWNmJTYjVcl6KK0Ci'
});


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
app.use(express.cookieParser())
app.use(express.session({ secret: 'keyboard cat' , key: 'sid', cookie: {secure: true}}));
app.use(app.router);
app.use(passport.initialize());
app.use(passport.session());

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

/*
var consumer = new oauth.OAuth(
    "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", 
    T.consumer_key, T.consumer_secret, "1.0A", "https://statusmash.herokuapp.com", "HMAC-SHA1");

//authentication for twitter
app.get('/sessions/connect', function(req, res){
  consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      res.send("Error getting OAuth request token : " + util.inspect(error), 500);
    } else {  
      req.session.oauthRequestToken = oauthToken;
      req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);      
    }
  });
});
*/

passport.use(new TwitterStrategy({
    consumerKey: 'M5fthvJjAiMD0ka4MaTOCcJ33',
    consumerSecret: 'DMkGty3P3VXtja20UJpfKmh5CxKR51QrBJrzLsxYllnkFQhSS2',
    callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Twitter profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Twitter account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


// GET /auth/twitter
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Twitter authentication will involve redirecting
//   the user to twitter.com.  After authorization, the Twitter will redirect
//   the user back to this application at /auth/twitter/callback
app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

// GET /auth/twitter/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
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


app.get('/auth/twitter',
  passport.authenticate('twitter'));

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log("authentication");
    //res.redirect('/');
  });

/*app.get('/tweet', function(err, res) {
	T.get('search/tweets', { q: 'banana since:2011-11-11', count: 100 }, function(err, reply) {
        console.log("banana tweets: " + reply);
	});
	res.render('index', {title: "Not Connected", button: "LOGIN TO FACEBOOK"});
});*/

//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});