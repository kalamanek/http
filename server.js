var fs = require('fs');
var http = require('http');
var path = require('path');
var mime = require('mime');
var mongodb = require("mongodb");

var mongo = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var debugLog = true; // turning on logging to the console

var db = null;

mongo.connect("mongodb://localhost:27017", { useNewUrlParser: true }, function(err, conn) {
	
	if(err) {
			console.log(err);
			return;
	}

	db = conn.db("pai");
	console.log("Connection to pai established");
	
});


function serveFile(rep, fileName, errorCode, message) {
	
	if(debugLog) console.log('Serving file ' + fileName + (message ? ' with message \'' + message + '\'': ''));
	
    fs.readFile(fileName, function(err, data) {
		if(err) {
            serveError(rep, 404, 'Document ' + fileName + ' not found');
        } else {
			rep.writeHead(errorCode, message, { 'Content-Type': mime.getType(path.basename(fileName)) });
			if(message) {
				data = data.toString().replace('{errMsg}', rep.statusMessage).replace('{errCode}', rep.statusCode);
			}
			rep.end(data);
        }
      });
}

function serveError(rep, error, message) {
	serveFile(rep, 'html/error.html', error, message);
}

function serveErrorJson(rep, error, message) {
	rep.writeHead(error, { "contentType": "application/json" });
	rep.write(JSON.stringify({ "error": message }));
	rep.end();
}


var listeningPort = 8888;

/*
var person = [
	{ "123", "firstName": "Mariusz", "lastName": "Jarocki", amount: 500 },
	{ "firstName": "Jack", "lastName": "Daniels", amount: 129 },
	{ "firstName": "Jim", "lastName": "Beam", amount: 59 }
];
*/

var person = {
	"123": { "firstName": "Mariusz", "lastName": "Jarocki", amount: 500 },
	"456": { "firstName": "Jack", "lastName": "Daniels", amount: 129 },
	"789": { "firstName": "Jim", "lastName": "Beam", amount: 59 }
};

http.createServer().on('request', function (req, rep) {
	
	if(debugLog) console.log('HTTP request: ' + req.method + " " + req.url);
	
	switch(req.url) {
		case '/':
			serveFile(rep, 'html/index.html', 200, '');
			break;
		case '/favicon.ico':
			serveFile(rep, 'img/favicon.ico', 200, '');
			break;
		case '/persons':
			db.collection("persons").find().toArray(function(err, docs) {
				if(err) {
					serveErrorJson(rep, 404, 'Not found');
					return;
				}
				rep.writeHead(200, { "Content-type": "application/json" });
				rep.write(JSON.stringify(docs));
				rep.end();
			})
			break;			
		default:
			if(/^\/(html|css|js|fonts|img)\//.test(req.url)) {
				
				var fileName = path.normalize('./' + req.url)
				serveFile(rep, fileName, 200, '');
				
			} else if(/\/person\//.test(req.url)) {
				
				var a = req.url.split("/");
				var id;
				try {
					id = ObjectId(a[2]);
				} catch(ex) {
					serveErrorJson(rep, 405, 'Not acceptable');
					return;
				}
				
				switch(req.method) {
					case "GET":
						db.collection("persons").findOne({ _id: id }, function(err, doc) {
							if(err || !doc) {
								serveErrorJson(rep, 404, 'Not found');
								return;
							}
							rep.writeHead(200, { "Content-type": "application/json" });
							rep.write(JSON.stringify(doc));
							rep.end();
						});
						break;
					case "POST":
						var content = "";
						req.setEncoding("utf8");
						req.on("data", function(data) {
							content += data;
						}).on("end", function() {
							var obj = {};
							try {
								obj = JSON.parse(content);
								if(!("amount" in obj) || typeof(obj.amount) != "number") {
									serveErrorJson(rep, 406, 'Not acceptable');
									return;
								}
							} catch(ex) {
								serveErrorJson(rep, 406, 'Not acceptable');
								return;
							}
							db.collection("persons").update(
									{ "_id" : id },
									{$inc:	{	"amount":obj.amount	}	}
								);
								
							db.collection("persons").find().toArray(function(err, docs) {
								if(err) {
									serveErrorJson(rep, 404, 'Not found');
									return;
								}
								rep.writeHead(200, { "Content-type": "application/json" });
								rep.write(JSON.stringify(docs));
								rep.end();
							})
						});
						break;
					default:
						serveErrorJson(rep, 405, 'Method not allowed');
				}
								
			} else {	
				serveError(rep, 403, 'Access denied');
			}
		}
	}
).listen(listeningPort);