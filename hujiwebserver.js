var fs = require('fs'),
    util = require('util'),
    eventEmitter = require("events"),
    constants = require('./Constants'),
    pathModule = require('path'),
    hujiNet = require('./hujinet'),
    httpRequest = require('./Request'),
    net = require('net');

var SPACE = require('./Constants').SPACE;
var CRLF = require('./Constants').CRLF;
var notExist = require('./Constants').notExist;
var exist = require('./Constants').exist;
var statusCodes = require('./Constants').statusCodesByMessage;
var statusMessages = require('./Constants').statusMessageByCode;
var requestErrors = require('./Constants').customErrorMessages;
var contentTypes = require('./Constants').fileExtensions;

exports.start = start;
exports.stop = stop;

/**
 * start function which starts a new server on port.
 * @param port
 * @param rootFolder
 * @param callback
 * @returns {*|StaticServer}
 */
function start( port, rootFolder, callback) {
    var staticServer, realServer;

    try {
        // create server-object-wrapper "StaticServer" for actual realServer object
        staticServer = new hujiNet.StaticServer( port, rootFolder);
        realServer = staticServer.createStaticServer();
        callback();
        return staticServer;
    }
    catch ( error) {
        callback( error);
    }
}


/**
 *
 * @param staticServer
 * @param callback
 */
function stop ( staticServer, callback) {
    try {
        staticServer.close(callback);
    }
    catch (err) {
        console.log("Error occurred while closing server" + err.message);
    }
}
