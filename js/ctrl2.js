app.controller("Ctrl2", ["$http", function($http) {

    console.log("Ctrl2 started");

    var ctrl = this;

    ctrl.persons = [];
    ctrl.person = {};

    ctrl.nSkip = 0;
    ctrl.nLimit = 10;
    ctrl.count = 0;
	ctrl.confirm ={};
	ctrl.id_to_change;

    ctrl.refreshCount = function() {
        $http.get("/persons/?").then(
            function(rep) { ctrl.count = rep.data.count; },
            function(err) { ctrl.count = 0; }
        );
    }

    ctrl.refreshPersons = function() {
        $http.get("/persons/" + ctrl.nSkip + "/" + ctrl.nLimit).then(
            function (rep) {
                ctrl.persons = rep.data;
            },
            function (err) {
                ctrl.persons = [];
            }
        );
    }

	
	ctrl.confirm.action = function(){
		$("#confirmDialog").modal("hide");
	}
	ctrl.getPerson = function(id){
		$http.get("/person/" + id).then(
            function (rep) {
				
				console.log(rep.data);
                ctrl.person = rep.data;
            },
            function (err) {
                ctrl.person = {};
            }
        );
	}
	
	ctrl.editPerson = function(id){
		$("#editPerson").modal();
		console.log(id);
		this.getPerson(id);
		id_to_change = id;
	}
	ctrl.editForm = function(){
		console.log(ctrl.person);
		$http.post("/person/" + ctrl.person._id, ctrl.transfer).then(
            function(rep) {
                ctrl.alertInfo = "info";
                ctrl.alertMsg = "Transfer successful";
            },
            function(err) {
                ctrl.alertType = "warning";
                ctrl.alertMsg = "Transfer failed";
        });
		
		$("#editPerson").modal("hide");
	}
    ctrl.insert = function() {
		//$("#confirmDialog").modal();
        var newObj = {};
        for(var key in ctrl.person) {
            newObj[key] = ctrl.person[key];
        }
        $http.post("/addPerson", newObj).then(
            function(rep) {
                ctrl.refreshPersons();
                ctrl.count++;
                ctrl.person = {};
            },
            function(err) {
                console.log("Error on insert: " + JSON.stringify(err));
            }
        );
    }

    ctrl.prev = function() { ctrl.nSkip -= 10; ctrl.refreshPersons(); }
    ctrl.next = function() { ctrl.nSkip += 10; ctrl.refreshPersons(); }

    ctrl.refreshCount();
    ctrl.refreshPersons();

}]);