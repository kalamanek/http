app.controller('Page4', ['$http', 'globals', 'ws',
    function ($http, globals,  ws, $scope) {
        var self = this;

		self.groupsUser = {};
		self.currentGroup = {_id : null ,name:'' }
		self.addGroup = {};
		self.addGroupMsg = null;
		
        self.allGroups = {};

        self.getAllGroups = function () {
            $http.get('/groups').then(
                function (rep) {
                    try {
                        self.allGroups = rep.data;
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }
		self.getAllGroups();
		
        self.getGroupUsers = function (group_id) {
			self.currentGroup._id = group_id;
			$http.put('/admin/groupusers', {_id: group_id}).then(
				function (rep) {
					try {
						console.log(rep.data);
						self.groupsUser = rep.data;
					} catch (err) {
					}
				},
				function (err) {
			});
			//chat name
			self.allGroups.forEach((v, i) => {
				if(self.allGroups[i]._id === group_id){
					self.currentGroup.name = self.allGroups[i].name;
				}
			});
        };
		self.removeUserFromGroup = function(user_id){
			
			$http.put('/admin/removeuserfromgroup', {user_id: user_id , group_id: self.currentGroup._id}).then(
				function (rep) {
					try {
						console.log(rep.data);
						self.removeUserFromList(user_id);
					} catch (err) {
					}
				},
				function (err) {
			});
		}
		self.removeUserFromList = function(user_id){
			for (let k in self.groupsUser) {
                if (self.groupsUser[k]._id === user_id) {
                    self.groupsUser.splice(k, 1);
					return;
                }
            }
		}
		self.removeGroupFromList = function(group_id){
			for (let k in self.allGroups) {
                if (self.allGroups[k]._id === group_id) {
                    self.allGroups.splice(k, 1);
					return;
                }
            }
		}
		self.addGroupModal = function(){//TODO make sure not empty
			$http.put('/admin/group', {name: self.addGroup.name , info: self.addGroup.info}).then(
				function (rep) {
					try {
						console.log(rep.data);
						self.addGroup = {};
						self.addGroupMsg = null;
                        $("#addGroup").modal('hide');
						
					} catch (err) {
					}
				},
				function (err) {
					self.addGroupMsg = 'cannot add group';
			}).then(self.getAllGroups());
		}
		self.removeGroup = function(group_id){
			console.log(group_id);
			$http.post('/admin/group', {_id: group_id}).then(
				function (rep) {
					try {
						self.removeGroupFromList(group_id);
					} catch (err) {
					}
				},
				function (err) {
			});
		}
	}
]);
