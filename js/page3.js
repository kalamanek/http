app.controller('Page3', ['$http', 'globals', 'ws',
    function ($http, globals,  ws, $scope) {
        var self = this;

        self.allUsers = [];
		self.userChange = {};
        self.getAllUsers = function () {
            $http.get('/admin/allusers').then(
                function (rep) {
                    try {
                        self.allUsers = rep.data;
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }
		self.getAllUsers();
		
		self.giveAdmin = function(user){
			user.role="Admin";
			self.updateUser(user);
		}	
		self.removeAdmin = function(user){
			delete user.role;
			self.updateUser(user);
		}	
		self.removeUser = function(user){
			$http.put('/admin/changeUser', user).then(
                function (rep) {
                    try {
						console.log(rep);
                    } catch (err) {
                    }
                },
                function (err) {
                }).then(self.getAllUsers());
		}
		self.changeUser = function(user){
			$('#changeUser').modal('show');
			self.userChange = user;
		}
		self.pushUser = function (){
			self.updateUser(self.userChange);
			$('#changeUser').modal('hide');
		}
		self.updateUser = function(user){
			console.log(user);
			 $http.post('/admin/changeUser', user).then(
                function (rep) {
                    try {
						console.log(rep);
						if(user._id == globals.session._id){
							window.location.reload(false);
						}
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
		}
	}
]);
