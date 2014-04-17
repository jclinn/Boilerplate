var graph = require('fbgraph');

exports.view = function(req, res) {
	res.render('index', {title: "Not Connected", button: "LOGIN TO FACEBOOK", twitbutton: "LOGIN TO TWITTER"});
}

exports.logged_in = function(req, res) {
	graph.get("/me/statuses", function(err, res) {
		console.log(res);
	});
	res.render("index", { title: "Logged In", button: "LOG OUT OF FACEBOOK", twitbutton: "LOG OUT OF TWITTER" });
}