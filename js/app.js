var app = angular.module('app', ['ngRoute', 'ngCookies', 'ngWebSocket', 'ngAnimate', 'ui.bootstrap']);

app.value('globals', { session: { _id: '', user: '' }, lastMessage: { from: '', message: '' } });

app.service('common', ['$http', 'globals', function($http, globals) {

	this.getSession = function(callback) {
		$http.get('/auth').then(
			function(response) {
				if(!globals.session) {
					console.log(response.data);
					globals.session = response.data;
				}
				callback(response.data);
			},
			function(err) {
				callback({});
			}
		);
	}

	
}]);

app.factory('ws', ['$websocket', 'globals', function($websocket, globals) {
    
	var dataStream = $websocket('ws://' + window.location.host);
	
    dataStream.onMessage(function(message) {
		try {
			var msg = JSON.parse(message.data);
			globals.lastMessage.from = msg.from;
			globals.lastMessage.message = msg.message;
			globals.lastMessage.group_id = msg.group_id;
			globals.lastMessage.seen = false;
			console.log('Received by ws: ' + JSON.stringify(globals.lastMessage));
		} catch(err) {
			console.log('Error during parsing the message from ws: ' + message.data);			
		}
    });

	
	return {
		
		init: function(sessId) {
				console.log('Sending initialization message by ws with session ' + sessId);
				dataStream.send(JSON.stringify({ session: sessId }));			
		}
	}

}]);