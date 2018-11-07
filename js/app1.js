var app = angular.module("app1", []);

app.controller("Ctrl1", [ "$http", function($http) {
	
	var ctrl = this;
	
	ctrl.person = {};
	ctrl.personToEdit = {};
	ctrl.transfer = { "amount": 0 };
	ctrl.personsList = [];
	
	$http.get("/persons").then(
		function(rep) {
			ctrl.personsList = rep.data;
			ctrl.person = ctrl.personsList[0];
			ctrl.selectChanged();
		},
		function(err) {
			console.log(err);
		}
	);
	
	ctrl.getPerson = function() {
		$http.get("/person/" + ctrl.person._id).then(
			function(rep) {
				ctrl.personToEdit = rep.data;
			},
			function(err) {
				console.log(err);
			}
		);
	}
	
	ctrl.doTransfer = function() {
		console.log(ctrl.transfer);
		$http.post("/person/" + ctrl.person._id, ctrl.transfer).then(
			function(rep) {
				ctrl.personsList = rep.data;
				ctrl.getPerson();
			},
			function(err) {
				console.log(err);
			}		
		);
	};
	
	ctrl.selectChanged = function() {
		ctrl.getPerson();
	}
	
}]);