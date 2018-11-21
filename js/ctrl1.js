app.controller("Ctrl1", [ "$http", function($http) {

    console.log("Ctrl1 started");

    var ctrl = this;

    ctrl.alertType = "info";
    ctrl.alert = "";
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
            ctrl.alertType = "warning";
            ctrl.alertMsg = "Cannot retrieve data";
        }
    );

    ctrl.getPerson = function() {
        $http.get("/person/" + ctrl.person._id).then(
            function(rep) {
                ctrl.personToEdit = rep.data;
            },
            function(err) {
                ctrl.alertType = "warning";
                ctrl.alertMsg = "Cannot retrieve data";
            }
        );
    }

    ctrl.doTransfer = function() {
        $http.post("/person/" + ctrl.person._id, ctrl.transfer).then(
            function(rep) {
                ctrl.personToEdit = rep.data;
                ctrl.transfer.amount = 0;
                ctrl.alertInfo = "info";
                ctrl.alertMsg = "Transfer successful";
            },
            function(err) {
                ctrl.alertType = "warning";
                ctrl.alertMsg = "Transfer failed";
            }
        );
    };

    ctrl.selectChanged = function() {
        ctrl.getPerson();
    };

    ctrl.closeAlert = function() {
        ctrl.alertMsg = "";
    };

}]);