var debugLog = false;

var dbName = 'communicationSystem';

if (debugLog) console.log('Initialization of \'' + dbName + '\'');

var mongojs = require('mongojs');
var db = mongojs(dbName);

var persons = db.collection('persons');
var groups = db.collection('groups');

if (debugLog) console.log('Delete collections');

persons.drop();
groups.drop();

personsExample = [
    {firstName: 'Piotr', lastName: 'Kluska', email: 'q', password: 'q', groups: [] , role: 'Admin'},
    {firstName: 'Bartek', lastName: 'Kluska', email: 'a', password: 'a', groups: []}
];

groupsExample = [
    {name: 'Informatyka', info: 'Grupa o informatyce'},
    {name: 'Muzyka', info: 'Grupa o muzyce'},
    {name: 'Gry', info: 'Grupa o grach'},
    {name: 'Boks', info: 'Grupa o boksie'},
    {name: 'Anonimowi Alkoholicy', info: 'Grupa o ...'},
];


if (debugLog) console.log('Creating new collections');

for (var i in personsExample) {
    if (debugLog) {
        console.log(JSON.stringify(personsExample[i]));
    }
    persons.insert(personsExample[i]);
}

for (var i in groupsExample) {
    if (debugLog) {
        console.log(JSON.stringify(groupsExample[i]));
    }
    groups.insert(groupsExample[i]);
}
