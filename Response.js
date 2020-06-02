/**
 * Created by Nicole Sadagursky on 30/12/2015.
 */
var constants = require("./Constants"),
    extensions = require("./Constants").fileExtensions,
    SPACE = require('./Constants').SPACE,
    CRLF = require('./Constants').CRLF,
    DOUBLE_CRLF = require('./Constants').DOUBLE_CRLF,
    timeOut2sec = require('./Constants').timeOut2sec,
    COLON = require('./Constants').COLON,
    SLASH = require('./Constants').SLASH,
    EMPTY_STR = require('./Constants').EMPTY_STR,
    HTTP = require('./Constants').HTTP,
    customErrorMessages = require('./Constants').customErrorMessages,
    messageByCode = require('./Constants').statusMessageByCode,
    codeByMessage = require('./Constants').statusCodesByMessage;


exports.HttpRespond = HttpRespond;

/**
 * HttpRespond class. Stores all response data and fields from http response.
 * @constructor
 */
function HttpRespond() {

    /* Public fields */
    this.head = EMPTY_STR; // head of response
    this.headersDict = {}; // all headers tags and values
    this.body = EMPTY_STR; // body of response default empty string
    this.httpVersion = EMPTY_STR; // http type
    this.connectionMode = EMPTY_STR; // connectionMode type
    this.statusCode = EMPTY_STR;
    this.statusErrorMessage = EMPTY_STR;

}  // end of HttpRespond class definition


/**
 * Sets the http version according to the request object.
 * @param reqHttpVersion
 */
HttpRespond.prototype.setHttpVersion = function( reqHttpVersion){
    this.httpVersion = reqHttpVersion;
};


/**
 * Sets the connectionMode type according to the request object.
 * @param reqConnection
 */
HttpRespond.prototype.setConnection = function( reqConnection){
    this.connectionMode = reqConnection;
};


/**
 * Adds a new header to the heads dict, with header tag key and header value.
 * @param headerTag
 * @param headerValue
 */
HttpRespond.prototype.addHeader = function(headerTag, headerValue){
    this.headersDict[headerTag] = headerValue;
};


/**
 * Writes the first header line in response http string.
 * @param code
 * @param message
 */
HttpRespond.prototype.writeHead = function( code){
    this.statusCode = code;
    this.head = HTTP + SLASH + this.httpVersion.toString() + SPACE +
        code.toString() + SPACE + messageByCode[code] + CRLF;
};


/**
 * Function defines the basic headers which are in common in all response types -
 * for an error response and for the good response on which file requested was found.
 * @param code
 * @param contentLength
 * @param contentType
 */
HttpRespond.prototype.defineBasicHeaders = function( code, contentLength, contentType){
    /* full date in the format of: Fri, 31 Dec 1999 23:59:59 GMT */
    var date = new Date().toUTCString();
    this.writeHead( code);
    this.addHeader("Date", date);
    this.addHeader("Content-Length", contentLength);
    this.addHeader("Connection", this.connectionMode);
    this.addHeader("Content-Type", contentType);
};


/**
 * Function creates all the headers for a valid request - when file was found.
 * @param code
 * @param message
 * @param contentLength
 * @param keepAlive
 * @param contentType
 * @param lastModified
 */
HttpRespond.prototype.setOkHeaders = function( code, contentLength, contentType, lastModified){
    this.defineBasicHeaders( code, contentLength, extensions[contentType]);
    this.addHeader("Last-Modified", lastModified.toUTCString());
};


/**
 * Function creates all the headers for a invalid request - when file was not found
 * or there was some error.
 * @param errorCode
 * @param errorMessage
 */
HttpRespond.prototype.setErrorHeaders = function( errorCode, errorMessage){
    var customMessage = errorMessage;
    if ( errorMessage in customErrorMessages){
        customMessage = customErrorMessages[errorMessage];
    }
    var bodyMessage = '<html><head><title>' + errorCode.toString() + SPACE + messageByCode[errorCode];
    bodyMessage += '</title></head><body><h1>' + customMessage + '</h1></body></html>';

    this.defineBasicHeaders( errorCode, bodyMessage.length, extensions[".html"]);
    this.body = bodyMessage;
};


/**
 * Function gets the full response string.
 * @returns response string with all headers and body.
 */
HttpRespond.prototype.getRespondString = function() {
    var respondStr = this.head;
    var responseHeaders = this.headersDict;
    Object.keys( responseHeaders).forEach( function(headerTag) {
        respondStr += headerTag + COLON + SPACE + responseHeaders[headerTag] + CRLF;
    });
    respondStr += CRLF + this.body;
    return respondStr;
};


