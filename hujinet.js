/**
 * Created by Nicole Sadagursky on 30/12/2015.
 */
/*
 * The module ‘hujinet’ which is in charge of communication with
 * the node ‘net’ module including receiving and sending HTTP calls.
 * This module should ‘understand’ what part of the network stream is
 * actually an HTTP message and then it should parse it.
 */
/* Global variables  */
var fs = require('fs'),
    util = require('util'),
    eventEmitter = require("events"),
    constants = require('./Constants'),
    CRLF = require('./Constants').CRLF,
    DOUBLE_CRLF = require('./Constants').DOUBLE_CRLF,
    statusCodes = require('./Constants').statusCodesByMessage,
    OK = statusCodes['OK'], // 200
    timeOut2sec = require('./Constants').timeOut2sec,
    pathModule = require('path'),
    httpRequest = require('./Request'),
    httpRespond = require('./Response'),
    notExist = require('./Constants').notExist,
    isRequestPartial = require('./Request').isRequestPartial,
    net = require('net');

exports.StaticServer = StaticServer;

/**
 * This is a server-object-wrapper "StaticServer" for actual realServer object.
 * This StaticServer maintain a dictionary (like a hash) of all connected sockets
 * in order to be able to end all of them in case the server stops.
 * @param port
 * @param rootFolder
 * @constructor
 */
function StaticServer( port, rootFolder) {

    // private fields
    var serverPort = port;
    var serverRootDir = rootFolder;

    // public fields
    this.realServer = undefined; // actual realServer object

    /* serverObj should have a two read-only properties (Object.defineProperty()) */
    /**
     * port property
     * @returns {*serverPort}
     */
    this.port = function(){
        return serverPort;
    };

    /**
     * rootFolder property
     * @returns {*serverRootDir}
     */
    this.rootFolder = function(){
        return serverRootDir;
    };

} // end of StaticServer class definition


/**
 * Gets the address of the server
 * @returns {*this.realServer.address}
 */
StaticServer.prototype.address = function() {
    if ( typeof this.realServer !== "undefined") {
        return this.realServer.address();
    }
    return notExist;
};


/**
 * Function that creates the actual net server which maintain the sockets.
 * @param serverIndex
 * @returns {*this.realServer}
 */
StaticServer.prototype.createStaticServer = function() {
    var rootFolder = this.rootFolder();
    var port = this.port();
    var sockets = []; // all connected sockets

    // Create a new TCP server
    this.realServer = net.createServer( function( socket){
        // add a new connected socket into sockets
        sockets.push( socket);
        var requestStr = ''; // request string

        // on data event - keep alive and handle an incoming request
        socket.on('data', function( chunk) {
            socket.setKeepAlive( true);
            var requestChunk = chunk.toString();
            requestStr += requestChunk; // collect chunks

            // in case it is a full request string - handle it
            if ( !isRequestPartial (requestStr)) {
                StaticServer.handleRequest( socket, requestStr, rootFolder);
                requestStr = ''; // initialize string for next request
            }
        });

        // on end event - remove this socket from sockets
        socket.on( 'end', function () {
            sockets.splice( sockets.indexOf(socket), 1);
        });

        // on error event - ensure that no more I/O activity happens on socket
        socket.on( 'error', function ( error) {
            var socketId = sockets.indexOf( socket);
            sockets[socketId].destroy();
            sockets.splice( socketId, 1);
        });

        socket.on( 'close', function () {
            sockets.splice( sockets.indexOf(socket), 1);
        });

        // after no request in 2 seconds - end socket activity
        socket.setTimeout( timeOut2sec ,function() {
            socket.end();
        });

    });

    this.realServer.maxConnections = constants.maxLimitConnect;
    this.realServer.listen( port);

    return this.realServer;
};


/**
 * Function sets the netSever object to listen to the given port.
 * @param port
 */
StaticServer.prototype.listen = function( port){
    if ( this.realServer !== undefined){
        this.realServer.listen( port);
    }
};



/**
 * Function that stops the server - ends all the sockets on server and closes the server.
 * this calls the callback once the server is down.
 * Function that stops the server. serverObj should have a .stop(callback).
 * @param callback
 */
StaticServer.prototype.stop = function( callback) {
    this.realServer.close( callback);
};


/**
 * Function handles an incoming request on socket on server
 * static function of StaticServer
 * @param socket
 * @param request
 */
StaticServer.handleRequest = function( socket, request, rootFolder) {
    var hujiRequest = new httpRequest.HttpRequest( request, rootFolder);
    hujiRequest.parseRequestString();
    // var fullPath = pathModule.resolve(rootDir, relativePath);
    var fullPath = hujiRequest.fullPath;
    var hujiResponse = new httpRespond.HttpRespond();

    // check error#1 - http version is not supported
    hujiRequest.validateHttpVersion( hujiResponse);
    if ( hujiRequest.statusCode !== OK) {
        socketWriteEnd( socket, hujiResponse, fullPath);
        return;
    }
    /* set connectionMode of request and response according to request*/
    hujiRequest.setConnection( hujiResponse);

    // check error#2 - method request is not supported
    hujiRequest.validateMethod( hujiResponse);
    if ( hujiRequest.statusCode !== OK) {
        socketWriteEnd( socket, hujiResponse, fullPath);
        return;
    }

    // check error#3 - path url in request is relative, or invalid
    hujiRequest.validatePath( hujiResponse);
    if ( hujiRequest.statusCode !== OK) {
        socketWriteEnd( socket, hujiResponse, fullPath);
        return;
    }

    // check error#4 - file extension is unsupported
    hujiRequest.validateFileExtension( hujiResponse);
    if ( hujiRequest.statusCode !== OK) {
        socketWriteEnd( socket, hujiResponse, fullPath);
        return;
    }

    // check error#5 - if file path exists and leads to a readable file
    validateFileExist( socket, hujiRequest, hujiResponse);

    return;
};


/**
 * Function checks if file exists, not a directory, can be read and opened.
 * The function sets the hujiResponse headers string according to the error or success.
 */
function validateFileExist( socket, hujiRequest, hujiResponse) {
    var lastModified = undefined, fileSize = 0;
    var fullPath = hujiRequest.fullPath;

    var statObj = fs.stat( fullPath, function (err, fileStat) {
        // check error#5 - file path does not exist
        if ( err) {
            hujiRequest.statusCode = 404;
            hujiRequest.statusErrorMessage = 'Not Found';
        } else {
            // check error#6 - file path is directory
            if ( fileStat.isDirectory()) {
                hujiRequest.statusCode = 404;
                hujiRequest.statusErrorMessage = 'Directory Path';

            } else if ( fileStat.isFile()) {
                // try to read  the file
                var readStream = fs.createReadStream( fullPath);
                // check error#7 - can't read and open file
                readStream.on( 'error', function(err) {
                    hujiRequest.statusCode = 404;
                    hujiRequest.statusErrorMessage = 'Error File Reading';
                });
                // in case file opens ok - collect data:
                lastModified = new Date(fileStat['mtime']); // modify time
                fileSize = fileStat.size;
            }
        }
        /* if statusCode was changed */
        if ( hujiRequest.statusCode !== OK) {
            hujiResponse.setErrorHeaders( hujiRequest.statusCode, hujiRequest.statusErrorMessage);
        } else {
            hujiResponse.setOkHeaders( hujiRequest.statusCode, fileSize, hujiRequest.extension, lastModified);
        }
        socketWriteEnd( socket, hujiResponse, fullPath);
    });
}


/**
 * Function writes the response into socket and then ends it after timeOut2sec.
 * @param socket
 * @param responseStr
 */
function socketWriteEnd( socket, hujiResponse, fullPath) {
    var response = hujiResponse.getRespondString();
    socket.write(response);

    // in case file was found - pipe it
    if ( hujiResponse.statusCode === OK) {
        var readStream = fs.createReadStream( fullPath);
        // wait til the readable stream is valid prior to piping
        readStream.on('open', function() {
            readStream.pipe(socket);
        });
    }
    /* If the http version is 1.0 and there is no Connection header,
     or if the http is 1.1 and there is 'Connection: close' header =>
     both case follow the same rule */
    if ( hujiResponse.connectionMode === 'close') {
        socket.end();
    }
}