/*
** Module dependencies
*/
var Client = require('./client');


/*
** Methods
*/
function wfs(url, options) {
    return new Client(url, options);
}


/*
** Exports
*/
module.exports = wfs;
