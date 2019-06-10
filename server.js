var fs = require('fs');
var http = require('http');
var path = require('path');
var mime = require('mime');
var Cookies = require('cookies');
var uuid = require('uuid');
var WebSocket = require('ws');
var fileSystem = require("fs");
var scope = require('scope');

require('./initialize.js');

var debugLog = true;
var sessions = {};

function serveFile(rep, fileName, errorCode, message) {

    if (debugLog) console.log('Serving file ' + fileName + (message ? ' with message \'' + message + '\'' : ''));

    fs.readFile(fileName, function (err, data) {
        if (err) {
            serveError(rep, 404, 'Document ' + fileName + ' not found');
        } else {
            rep.writeHead(errorCode, message, {'Content-Type': mime.getType(path.basename(fileName))});
            if (message) {
                data = data.toString().replace('{errMsg}', rep.statusMessage).replace('{errCode}', rep.statusCode);
            }
            rep.end(data);
        }
    });
}

if (!debugLog) process.on('uncaughtException', function (err) {
    console.log('\nRUNTIME ERROR\n\n' + err + '\n\nexiting...');
    process.exit(1);
});

function serveError(rep, error, message) {
    serveFile(rep, 'html/error.html', error, message);
}

var db = require('./db.js');

function isEmptyObject(obj) {
    for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            return false;
        }
    }
    return true;
}

function isEmpty(str) {
    return (!str || 0 === str.length);
}

function isLoggedIn(session) {
    if (session) {
        if (sessions[session].hasOwnProperty('_id') && !isEmpty(sessions[session]._id)) {
            return true;
        }
    }
    return false;
}


function register(req, rep) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var cred = JSON.parse(item);

            if (debugLog) console.log('register ' + JSON.stringify(cred));
            if (!isEmptyObject(cred)) {

                if (cred.firstName.length < 2) throw 'Too short FirstName';
                if (cred.firstName.length > 20) throw 'Too long FirstName';
                if (cred.lastName.length < 2) throw 'Too short LastName';
                if (cred.lastName.length > 20) throw 'Too long LastName';
                if (cred.email.length < 2) throw 'Too short Email';
                if (cred.email.length > 20) throw 'Too long Email';
                if (cred.password.length < 2) throw 'Too short Password';
                if (cred.password.length > 20) throw 'Too long Password';
                if (cred.hasOwnProperty('role')) throw 'Warning admin';  //TODO test it
				
				db.checkForUsedLogin(cred, function (user) {
					if (isEmptyObject(user)) {
						db.insertUser(cred);
						rep.writeHead(200, 'Register successful', {'Content-Type': 'application/json'});
						rep.end(JSON.stringify({email: cred.email}));
						if (debugLog) console.log('New account ' + JSON.stringify(cred));
					} else {
						rep.writeHead(401, 'Register failed', {'Content-Type': 'application/json'});
						rep.end(JSON.stringify({registerMsg: 'email is already taken'}));
						if (debugLog) console.log(JSON.stringify(cred) + ' are not val_id credentials');
					}
				});

            } else {
                throw 'obj is empty'
            }
        } catch (e) {
            rep.writeHead(401, 'Register failed', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({registerMsg: 'Something goes wrong.'}));
            if (debugLog) console.log(JSON.stringify(cred) + e);
        }

    });
}

function logIn(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var cred = JSON.parse(item);
            if (debugLog) console.log('trying to log in ' + JSON.stringify(cred));
            db.checkCredentials(cred, function (user) {
                if (!isEmptyObject(user)) {
                    if (session) {
                        sessions[session]._id = user._id;
                        sessions[session].groups = user.groups;
                        sessions[session].login = cred.login;
                        sessions[session].firstName = user.firstName;
                        sessions[session].lastName = user.lastName;
                        sessions[session].role = user.role;
                    }
                    rep.writeHead(200, 'Login successful', {'Content-Type': 'application/json'});
                    rep.end(JSON.stringify(user));
                    if (debugLog) console.log('User ' + JSON.stringify(user) + ' logged in');
				} else {
					rep.writeHead(401, 'Register failed', {'Content-Type': 'application/json'});
					rep.end(JSON.stringify({registerMsg: 'not val_id input'}));
					if (debugLog) console.log(JSON.stringify(cred) + ' are not val_id credentials');
				}
                
            });
        } catch (e) {
            rep.writeHead(401, 'Login failed', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({}));
            if (debugLog) console.log(JSON.stringify(cred) + ' are not val_id credentials' + e);
        }

    });
}

function logOut(req, rep, session) {
	if(debugLog) console.log('Destroying session ' + session + ': ' + JSON.stringify(sessions[session]));
	rep.writeHead(200, 'Session destroyed', { 'Content-Type': 'application/json' });
	rep.write(JSON.stringify(sessions[session]));
	if(session) {
	    if(sessions[session].user) {
			var user = sessions[session].user;
			broadcast(session, 'User ' + user.firstName + ' ' + user.lastName + ' logged out');
	    }
		delete sessions[session];
	}
	rep.end();
}

function whoAmI(req, rep, session) {
	rep.writeHead(200, 'Session info', { 'Content-Type': 'application/json' });
	if(session) {
		var sess = sessions[session];
		sess.id = session;
		rep.end(JSON.stringify(sess));
	} else {
		rep.end(JSON.stringify({}));		
	}
}


function getGroups(req, rep, session) {
    db.selectGroups(function (groups) {
        rep.writeHead(200, 'Groups', {'Content-Type': 'application/json'});
        rep.end(JSON.stringify(groups));
    });
}
function addGroup(req, rep, session) {
	var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var group = JSON.parse(item);
            if (debugLog) console.log('Trying to add group ' +JSON.stringify(group));

            db.addGroup(group.name, group.info , function(data){
            rep.writeHead(200, 'add group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify(data));
			});
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'declined'}));
        }

    });
}

function userGetGroups(req, rep, session) {
    db.selectUser(sessions[session]._id, function (user) {
        rep.writeHead(200, 'User groups found', {'Content-Type': 'application/json'});
        rep.end(JSON.stringify(user.groups));
    });
}

function userRemoveFromGroup(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
			console.log(JSON.parse(item));
            var groupToDelete = JSON.parse(item);
            if (debugLog) console.log('Trying to delete user ' + sessions[session]._id +'from group ' + JSON.stringify(groupToDelete._id));

            db.personRemoveGroup(sessions[session]._id, groupToDelete._id);
            rep.writeHead(200, 'Delete user group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'You ale not longer in this group.'}));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot delete group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot delete user group'}));
        }

    });
}
function removeGroup(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var groupToDelete = JSON.parse(item);
            if (debugLog) console.log('Trying to delete group ' + JSON.stringify(groupToDelete));

            db.removeGroup(groupToDelete._id);
            rep.writeHead(200, 'Delete group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Succesfull'}));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot delete group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot delete group'}));
        }

    });
}


function adminRemoveUserFromGroup(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        console.log(chunk);
        item += chunk;
    }).on('end', function () {
        try {
            var whoWhere = JSON.parse(item);
            if (debugLog) console.log('Trying to delete by admin user ' + JSON.stringify(whoWhere.user_id)+ 'from group'+ JSON.stringify(whoWhere.group_id));

            db.personRemoveGroup(whoWhere.user_id, whoWhere.group_id);
            rep.writeHead(200, 'Delete user group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'You have removed this person from group.'}));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot delete group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot delete user from group'}));
        }

    });
}


function userAddToGroup(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        console.log(chunk);
        item += chunk;
    }).on('end', function () {
        try {
            var groupToAdd = JSON.parse(item);
            if (debugLog) console.log('Trying to add user to group ' + JSON.stringify(groupToAdd._id));
            db.personAddGroup(sessions[session], groupToAdd._id , groupToAdd.name);
			
            rep.writeHead(200, 'Add user group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'You were added to group.'}));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot delete group', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot add user to this group'}));
        }
    });
}
function getTableUsers(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        console.log(chunk);
        item += chunk;
    }).on('end', function () {
        try {
            var group= JSON.parse(item);
            if (debugLog) console.log('Trying to get user of group ' + JSON.stringify(group._id));
			
            db.getGroupPersons(group._id, function (group) {
				rep.writeHead(200, 'reply group users', {'Content-Type': 'application/json'});
				rep.end(JSON.stringify(group));
			});
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot select group users', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot select group users'}));
        }
    });
}

function getGroupMessages(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var groupToShow = JSON.parse(item);
			if(!groupToShow.amount){
				if (debugLog) console.log('asked for messages of group ' + JSON.stringify(groupToShow._id));
				db.selectMessagesOfGroup(groupToShow._id,0, function (data) {
					rep.writeHead(200, 'Messages of group', {'Content-Type': 'application/json'});
					rep.end(JSON.stringify(data));
				});
			}else{
				if (debugLog) console.log('asked for messages of group ' + JSON.stringify(groupToShow._id) + "when have already " + JSON.stringify(groupToShow.amount));
					db.selectMessagesOfGroup(groupToShow._id,groupToShow.amount, function (data) {
						rep.writeHead(200, 'Messages of group', {'Content-Type': 'application/json'});
						rep.end(JSON.stringify(data));
					});
			}
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot select messages', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot show this group messages'}));
        }
    });
}


function sendGroupMessage(req, rep, session) {
    var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        item += chunk;
    }).on('end', function () {
        try {
            var message = JSON.parse(item);
            if (debugLog) console.log('Trying to send message ' + JSON.stringify(message.text) + ' to group ' + JSON.stringify(message.group_id));
            if (message.text.length > 0 && message.group_id.length > 0 && message.text.length < 100 && message.group_id.length < 30) {
				
				broadcast(session, message.text , message.group_id)
                db.insertMessagesOfGroup(sessions[session]._id, message.group_id, message.text, sessions[session].firstName + " " + sessions[session].lastName);
                rep.writeHead(200, 'Messages send', {'Content-Type': 'application/json'});
                rep.end(JSON.stringify({message: 'Message has been sent'}));
            } else {
                rep.writeHead(401, 'Cannot send message text or group blank ', {'Content-Type': 'application/json'});
                rep.end(JSON.stringify({message: 'Cannot send messages'}));
            }
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot send message', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot send messages'}));
        }
    });

}
function userBelongToGroup(data,client_id){
		for (let k in data) {
			console.log(data[k]._id + " compare "+client_id);
			if(JSON.stringify(data[k]._id) === JSON.stringify(client_id)){
				return true;
			}
		}
	return false;
}
function getAllUsers(req, rep, session){
	db.selectAllUsers(function (users) {
        rep.writeHead(200, 'users', {'Content-Type': 'application/json'});
        rep.end(JSON.stringify(users));
    });
}

var listeningPort = 8888;
var httpServer = http.createServer();
var wsServer = new WebSocket.Server({ server: httpServer });

function changeUser(req, rep, session){
	
	var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        console.log(chunk);
        item += chunk;
    }).on('end', function () {
        try {
            var user = JSON.parse(item);
            if (debugLog) console.log('update user' + JSON.stringify(user));

            db.updateUser(user);
			
            if (debugLog) console.log(JSON.stringify(user._id) + 'compare session' + JSON.stringify(sessions[session]._id));
			if(user._id == sessions[session]._id){
				if(debugLog) console.log('Destroying session ' + session + ': ' + JSON.stringify(sessions[session]));
				if(session) {
					if(sessions[session].user) {
						var user = sessions[session].user;
						broadcast(session, 'User ' + user.firstName + ' ' + user.lastName + ' logged out');
					}
					delete sessions[session];
				}
			}
			
            rep.writeHead(200, 'user set sucessfull', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify(user));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'something wrong', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify(user));
        }

    });
}

function  deleteUser(req, rep, session){
	var item = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        console.log(chunk);
        item += chunk;
    }).on('end', function () {
        try {
            var user = JSON.parse(item);
            if (debugLog) console.log('Trying to delete  user ' + JSON.stringify(user));

            db.removeUser(user._id);
			if(user._id == sessions[session]._id){
				if(debugLog) console.log('Destroying session ' + session + ': ' + JSON.stringify(sessions[session]));
				if(session) {
					if(sessions[session].user) {
						var user = sessions[session].user;
						broadcast(session, 'User ' + user.firstName + ' ' + user.lastName + ' logged out');
					}
					delete sessions[session];
				}
			}
            rep.writeHead(200, 'Delete user', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'You have removed this person'}));
        } catch (e) {
            if (debugLog) console.log(e);
            rep.writeHead(401, 'Cannot delete user', {'Content-Type': 'application/json'});
            rep.end(JSON.stringify({message: 'Cannot delete user '}));
        }

    });
}
function isAdmin(session){
	if(sessions[session].hasOwnProperty('role') && sessions[session].role == 'Admin')
		return true;
	return false;
}

httpServer.on('request', function (req, rep) {

        if (debugLog) console.log('HTTP request URL: ' + req.method + ' ' + req.url);

        var cookies = new Cookies(req, rep);
        var session = cookies.get('session');
        var now = Date.now();
		if(!session || !sessions[session]) {
			session = uuid();
			sessions[session] = { created: now, touched: now, user: null };
			cookies.set('session', session, { httpOnly: false });
			console.log('Creating new session ' + session);
		} else {
			sessions[session].touched = now;
			cookies.set('session', session, { httpOnly: false });
		}

        if (isLoggedIn(session)) {
			switch (req.url) {
				case '/':
					serveFile(rep, 'html/index.html', 200, '');
					break;
				case '/favicon.ico':
					serveFile(rep, 'img/favicon.ico', 200, '');
					break;
				case '/auth':
					switch (req.method) {
						case 'GET':
							whoAmI(req, rep, session);
							break;
						case 'POST':
							logIn(req, rep, session);
							break;
						case 'DELETE':
							logOut(req, rep, session);
							break;
						case 'PUT':
							if (!isLoggedIn(session)) {
								register(req, rep, session);
								break;
							}
						default:
							serveError(rep, 405, 'Method not allowed');
					}
					break;
				case '/groups':
					switch (req.method) {
						case 'GET':
							getGroups(req, rep, session);
							break;
						case 'PUT':
							getGroupMessages(req, rep, session);
							break;
						default:
							serveError(rep, 405, 'Method not allowed');
					}
					break;
				case '/group/messages':
					switch (req.method) {
						case 'POST':
							sendGroupMessage(req, rep, session); 
							break;
						default:
							serveError(rep, 405, 'Method not allowed');
					}
					break;
				case '/user/groups':
					switch (req.method) {
						case 'GET':
							userGetGroups(req, rep, session);
							break;
						case 'POST':
							userRemoveFromGroup(req, rep, session);
							break;
						case 'PUT':
							userAddToGroup(req, rep, session); 
							break;
						default:
							serveError(rep, 405, 'Method not allowed');
					}
					break;
				case '/admin/groupusers': // TODO make sure its admin
					if(isAdmin(session)){
						switch (req.method) {
							case 'PUT':
								getTableUsers(req, rep, session);
								break;
							default:
								serveError(rep, 405, 'Method not allowed');
						}
					}
					break;
				case '/admin/changeUser': // TODO make sure its admin
					if(isAdmin(session)){
						switch (req.method) {
							case 'POST':
								changeUser(req, rep, session);
								break;
							case 'PUT':
								deleteUser(req, rep, session);
								break;
							default:
								serveError(rep, 405, 'Method not allowed');
						}
					}
					break;
				case '/admin/removeuserfromgroup': // TODO make sure its admin
					if(isAdmin(session)){
						switch (req.method) {
							case 'PUT':
								adminRemoveUserFromGroup(req, rep, session);
								break;
							default:
								serveError(rep, 405, 'Method not allowed');
						}
					}
					break;
				case '/admin/allusers': // TODO make sure its admin
					if(isAdmin(session)){
						switch (req.method) {
							case 'GET':
								getAllUsers(req, rep, session);
								break;
							default:
								serveError(rep, 405, 'Method not allowed');
						}
					}
					break;
				case '/admin/group': // TODO make sure its admin 
					if(isAdmin(session)){
						switch (req.method) {
							case 'PUT':
								addGroup(req, rep, session);
								break;
							case 'POST':
								removeGroup(req, rep, session);
								break;
							default:
								serveError(rep, 405, 'Method not allowed');
						}
					}
					break;
				default:
					if (/^\/(html|css|js|fonts|img)\//.test(req.url)) {
						var fileName = path.normalize('./' + req.url)
						serveFile(rep, fileName, 200, '');
					} else {
						serveError(rep, 403, 'Access denied');
					}
			}
		}else{
			switch (req.url) {
				case '/':
					serveFile(rep, 'html/index.html', 200, '');
					break;
				case '/favicon.ico':
					serveFile(rep, 'img/favicon.ico', 200, '');
					break;
				case '/auth':
					switch (req.method) {
						case 'GET':
							whoAmI(req, rep, session);
							break;
						case 'POST':
							logIn(req, rep, session);
							break;
						case 'DELETE':
							logOut(req, rep, session);
							break;
						case 'PUT':
							if (!isLoggedIn(session)) {
								register(req, rep, session);
								break;
							}
						default:
							serveError(rep, 405, 'Method not allowed');
					}
					break;
				default:
					if (/^\/(html|css|js|fonts|img)\//.test(req.url)) {
						var fileName = path.normalize('./' + req.url)
						serveFile(rep, fileName, 200, '');
					} else {
						serveError(rep, 403, 'Access denied');
					}
			}
		}
	}
);

wsServer.on('connection', function connection(conn) {
	
	if(debugLog) console.log('WebSocket connection initialized');
  
	conn.on('message', function(message) {
		
		var rep = { error: 'OK' };
		try {
			
			msg = JSON.parse(message);
			if(debugLog) console.log('Frontend sent by ws: ' + JSON.stringify(msg));
			
			if(msg.session && !conn.session) {
				conn.session = msg.session;
				if(debugLog) console.log('WebSocket session set to ' + conn.session);
			}
			
		} catch(err) {
			if(debugLog) console.log('error in ws');
			rep.error = err;
		}
		conn.send(JSON.stringify(rep));
		if(debugLog) console.log('My answer sent by ws: ' + JSON.stringify(rep));
	
	}).on('error', function(err) {});
});

function broadcast(session, msg , group_id) {
	db.getGroupPersons(group_id, function (data) {
		wsServer.clients.forEach(function(client) {
			if(client.readyState === WebSocket.OPEN && userBelongToGroup(data, client.session) == true) {
				if(debugLog) console.log("Sending an event message to client " + client.session + " with data " + msg);
				client.send(JSON.stringify({ from: sessions[session].firstName + " "  + sessions[session].lastName ,message: msg ,group_id: group_id,}));
			}
		});
	});
}
httpServer.listen(listeningPort);

if (debugLog) console.log('Listening on port ' + listeningPort);