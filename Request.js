/**
 * Created by Nicole Sadagursky on 28/12/2015.
 */

var util = require('util'),
    constants = require('./Constants'),
    fs = require('fs'),
    pathModule = require('path');

var CRLF = require('./Constants').CRLF,
    DOUBLE_CRLF = require('./Constants').DOUBLE_CRLF,
    httpTypes = require('./Constants').supportedHttpTypes,
    fileExtensions = require('./Constants').fileExtensions,
    connectionByHttp = require('./Constants').defaultConnectionByHttp,
    notExist = require('./Constants').notExist,
    exist = require('./Constants').exist,
    SPACE = require('./Constants').SPACE,
    HTTP = require('./Constants').HTTP,
    COLON = require('./Constants').COLON,
    EMPTY_STR = require('./Constants').EMPTY_STR,
    GET = require('./Constants').GET_METHOD,
    http1_1 = require('./Constants').http1_1;

exports.HttpRequest = HttpRequest;

/**
 * Request Object - url request on server
 */
function HttpRequest( request, rootFolder) {
    this.rootFolder = rootFolder;
    this.request = request;
    this.fileName = EMPTY_STR;
    this.fullPath = EMPTY_STR;
    this.method = EMPTY_STR;
    this.httpType = EMPTY_STR;
    this.httpVersion = EMPTY_STR;
    this.extension = EMPTY_STR;
    this.headersDict = {};
    this.body = EMPTY_STR;
    // default is 'OK', will change on error
    this.statusCode = 200;
    this.statusErrorMessage = 'OK';
    this.connectionMode = EMPTY_STR;

} // end of HttpRespond class definition


/**
 * The function parses the request string into all it's headers.
 */
HttpRequest.prototype.parseRequestString = function(){

    var requestParts = this.request.split(DOUBLE_CRLF);
    var requestHeaders = requestParts[0]; // list of headers
    this.body = requestParts[1]; // body string if any exist after DOUBLE_CRLF

    // split string into lines by '\r\n' + remove empty lines from headers list
    var headersList = requestHeaders.split(CRLF);
    var requestLines = removeSpacesEmptyLines( headersList);

    // headRequest is the first line. of form: GET /Capture.png HTTP/1.1
    var headRequest = requestLines[0].split(SPACE);
    this.method = headRequest[0];
    this.httpType = headRequest[2];

    this.fileName = headRequest[1]; // keep file path original
    // for full path adjust file path for OS
    var fileNameNormal = headRequest[1];

    // if Windows replace all '/' with '\\'
    if( pathModule.sep === '\\') {
        fileNameNormal = headRequest[1].replace(/\//g, '\\');
        this.rootFolder = this.rootFolder.replace(/\//g, '\\');
    } else { // if Linux replace all '\\' with '/'
        fileNameNormal = headRequest[1].replace(/\\/g, '/');
        this.rootFolder = this.rootFolder.replace(/\\/g, '/');
    }
    this.fullPath = pathModule.join( this.rootFolder, fileNameNormal);

    this.extension = pathModule.extname( this.fullPath).toLowerCase();

    // add all header lines in request
    for (var i = 1; i < requestLines.length; i++) {
        // trim spaces and split header by header-key and it's value
        var headerLine = requestLines[i].split(COLON);
        this.addHeader( headerLine[0].replace(SPACE, EMPTY_STR), headerLine[1]);
    }
};


/**
 * Function gets a request string and checks if it is partial.
 * @param requestChunk
 * @returns {boolean}
 */
exports.isRequestPartial = function ( requestChunk) {
    var partial = true;
    var ContentLength = "Content-Length";
    var requestParts, requestHeaders, headersList, body = '';
    var headersDict = {}, contentValue = 0;
    var hasDoubleCRLF = requestChunk.indexOf(DOUBLE_CRLF);

    // if request do not have '\r\n\r\n' - it is partial
    if  ( hasDoubleCRLF == notExist) {
        return partial;
    }

    requestParts = requestChunk.split(DOUBLE_CRLF);
    // if request does not have 2 parts - it is partial
    if ( requestParts.length < 2) {
        return partial;
    }
    requestHeaders = requestParts[0]; // string of all headers
    body = requestParts[1]; // body string if any exist after DOUBLE CRLF

    headersList = requestHeaders.split(CRLF);
    var requestLines = removeSpacesEmptyLines( headersList);

    var headRequest = requestLines[0].split(SPACE);
    // if headRequest does not have 3 parts - it is partial
    if ( headRequest.length < 3) {
        return partial;
    }
    var method = headRequest[0];
    var fileName = headRequest[1]; // keep file path original
    var httpType = headRequest[2];
    var httpIndex = httpType.indexOf('HTTP/');

    // if request does not have HTTP/x or GET method - it is partial
    if ( httpIndex == notExist || method !== GET ){
        return partial;
    }

    // collect all header lines in request
    for (var i = 1; i < requestLines.length; i++) {
        // trim spaces and split header by header-key and it's value
        var headerLine = requestLines[i].split(COLON);
        var headerTag = headerLine[0].replace(SPACE, EMPTY_STR);
        headersDict[headerTag] = headerLine[1];
    }

    /* assuming when an request contains a body it contains a content-length header also */
    if ( body.length > 0 && (ContentLength in headersDict)) {
        // check if header value matches to body.length
        contentValue = parseInt(headersDict[ContentLength]);
        if (!isNaN(contentValue)) { // if it is a number
            if ( body.length == contentValue) {
                partial = false;
            }
        }
    } // if there is no body and there is no header - it is ok
    else if ( body.length === 0 && !(ContentLength in headersDict)) {
        partial = false;
    }

    return partial;
};


/**
 * Function checks whether the request method is legal and supported.
 * The httpType is the 'HTTP' name string and http version number.
 * @param hujiResponse
 */
HttpRequest.prototype.validateHttpVersion = function(hujiResponse) {
    var httpIndex = this.httpType.indexOf('/');
    var httpName = this.httpType.substring( 0, httpIndex); // string HTTP
    this.httpVersion  = this.httpType.substring(httpIndex + 1); // http version number

    if (!(this.httpVersion in httpTypes) || (httpName !== constants.HTTP)){
        this.statusCode = 505;
        this.statusErrorMessage = 'Http Version Error';
        this.httpVersion = http1_1; // set default if this is unsupported
        hujiResponse.setHttpVersion(this.httpVersion);
        hujiResponse.setErrorHeaders( this.statusCode, this.statusErrorMessage);
    } else {
        hujiResponse.setHttpVersion(this.httpVersion);
    }
};


/**
 * Function sets the connectionMode status according to the http version's default connectionMode,
 * when the connectionMode header in undefined.
 * @param hujiResponse
 */
HttpRequest.prototype.setConnection = function(hujiResponse) {
    if (typeof this.headersDict['Connection'] == 'undefined' || this.connectionMode === EMPTY_STR){
        this.connectionMode = connectionByHttp[this.httpVersion];
    }
    hujiResponse.setConnection( this.connectionMode);
};


/**
 * Function checks whether the request method is legal and supported.
 * in this ex only GET method is supported.
 * For any other type of HTTP request you should return HTTP response 500.
 * @param hujiResponse
 */
HttpRequest.prototype.validateMethod = function(hujiResponse) {
    if ( this.method !== constants.GET_METHOD) {
        this.statusCode = 500;
        this.statusErrorMessage = 'Method Not Implemented';
        hujiResponse.setErrorHeaders( this.statusCode, this.statusErrorMessage);
    }
};


/**
 * Function that validates the given file path is not relative or invalid.
 * @param hujiResponse
 */
HttpRequest.prototype.validatePath = function( hujiResponse) {
    // each file path request suppose to begin with '/'
    var colonIndex = this.fileName.indexOf( '/');
    var nextChar = this.fileName.charAt( colonIndex + 1);

    if ( this.fileName.charAt(0) !== '/') {
        this.statusCode = 404;
        this.statusErrorMessage = 'Bad Path Url';
        hujiResponse.setErrorHeaders( this.statusCode, this.statusErrorMessage);
    }
    else if ( nextChar === '.' || nextChar === '~' || nextChar === '/') {
        this.statusCode = 403;
        this.statusErrorMessage = 'Relative Path';
        hujiResponse.setErrorHeaders( this.statusCode, this.statusErrorMessage);
    }
};


/**
 * Validates the file extension - checks if it is supported.
 * @param hujiResponse
 */
HttpRequest.prototype.validateFileExtension = function( hujiResponse) {
    if (!(this.extension in fileExtensions)) {
        this.extension = constants.fileExtensions.other;
        this.statusCode = 415;
        this.statusErrorMessage = 'Unsupported Media Type';
        hujiResponse.setErrorHeaders( this.statusCode, this.statusErrorMessage);
    }
};


/**
 * Function add a new header tag and value to the headers dict of the request.
 * @param headerTag
 * @param headerValue
 */
HttpRequest.prototype.addHeader = function( headerTag, headerValue) {
    this.headersDict[headerTag] = headerValue;
};


// Helper functions :

/**
 * Function gets list of strings and returns a new list without any empty lines.
 * @param originalLinesList
 * @returns {Array}
 */
function removeSpacesEmptyLines( originalLinesList) {
    var cleanLinesList = [];
    for (var i = 0; i < originalLinesList.length; i++) {
        if ( originalLinesList[i] !== EMPTY_STR) {
            cleanLinesList.push( originalLinesList[i]);
        }
    }
    return cleanLinesList;
}