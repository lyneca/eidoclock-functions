const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment')
var rp = require('request-promise');

const WORLDSTATE_URL = 'http://content.warframe.com/dynamic/worldState.php';

admin.initializeApp();

const settings = { timestampsInSnapshots: true };
admin.firestore().settings(settings);

var docRef = admin.firestore().collection('state').doc('global')
var options = {
    uri: WORLDSTATE_URL,
    json: true,
}

function store(name, value) {
    return docRef.update({
        [name]: value
    }).then(() => {
        return true;
    }).catch(err => {
        console.error(err);
    });
}

function get(name) {
    return docRef.get()
        .then(doc => {
            var val = doc.get(name)
            return val;
        });
}

exports.getTime = functions.https.onRequest((request, response) => {
    get('expiryDate')
        .then(date => {
            response.send({ expiryDate: date });
            return get('lastSync')
        })
        .then(syncDate => {
            var time = moment.now().valueOf();
            if (time - syncDate > 1000 || syncDate === undefined) {
                store('lastSync', time);
                return rp(options);
            } else {
                return undefined;
            }
        })
        .then(json => {
            if (json !== undefined) {
                var expiryTimeMS = json['SyndicateMissions'].find(
                    element => (element['Tag'] === 'CetusSyndicate')
                )['Expiry']['$date']['$numberLong'];
                store('expiryDate', parseInt(expiryTimeMS));
            }
            return;
        })
        .catch(err => {
            console.error(err);
        })
});