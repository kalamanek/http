app.controller('Page2', ['$http',
    function ($http) {
        var self = this;

        self.userGroups = [];
        self.allGroups = {};
	self.reverse=true;
	self.propertyName = '';


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
	self.sortBy =function(propertyName){
	 this.reverse = (propertyName !== null && this.propertyName === propertyName)
        ? !this.reverse : false;
    	this.propertyName = propertyName;
	}

       self.getUserGroups = function () {
            $http.get('/user/groups').then(
                function (rep) {
                    try {
                        self.userGroups = rep.data;
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }

        self.checkIfInGroup = function (_idgroup) {
            for (let k in self.userGroups) {
                if (self.userGroups[k]._id === _idgroup) {
                    return true;
                }
            }
            return false;
        }

        self.groupUserRemove = function (_idgroup) {
            $http.post('/user/groups', {_id: _idgroup}).then(
                function (rep) {
                    try {
                        self.getUserGroups();
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }

        self.groupUserAdd = function (_idgroup , name_group) {
            $http.put('/user/groups', {_id: _idgroup , name : name_group}).then(
                function (rep) {
                    try {
                        self.getAllGroups();
                        self.getUserGroups();
                    } catch (err) {
                    }
                },
                function (err) {
                }
            );
        }
		
		
       self.getAllGroups();
       self.getUserGroups();

    }
]);