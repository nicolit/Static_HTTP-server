/**
 * Created by Nicole Sadagursky on 27/12/2015.
 */
/* List of constant variables for string and chars commonly used */
exports.timeOut2sec = 2000;
exports.NEWLINE = '\n';
exports.SPACE = ' ';
exports.EMPTY_STR = '';
exports.COLON = ':';
exports.CRLF = '\r\n';
exports.DOUBLE_CRLF = '\r\n\r\n';
exports.notExist = -1;
exports.exist = 1;
exports.http1_1 = '1.1' ;
exports.http1_0 = '1.0';
exports.HTTP = "HTTP";
exports.SLASH = '/';
exports.maxLimitConnect = 20000;
exports.GET_METHOD = "GET";
exports.WIN_SEP = '\\';
exports.LINUX_SEP = '/';

/* dict of all HTTP version numbers supported */
exports.supportedHttpTypes = {
    '1.1': 'http1_1',
    '1.0': 'http1_0',
};

/* dict of connection default types according to the HTTP version number,
when connection header in request is missing.*/
exports.defaultConnectionByHttp = {
    1.1: 'keep-alive',
    1.0: 'close'
};

/* dict of all the status messages according to the code. */
exports.statusMessageByCode = {
    200 :  'OK',
    400 : 'Bad Request',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    408 : 'Request Timeout', // The client did not produce a request within the time that the server was prepared to wait.
    411 : 'Length Required',
    413 : 'Request Entity Too Large',
    415 : 'Unsupported Media Type',
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    505 : 'HTTP Version Not Supported',
};

/* dict of all the status codes according to the status messages. */
exports.statusCodesByMessage = {
    'OK': 200,
    'Forbidden': 403,
    'Not Found': 404,
    'Method Not Allowed': 405,
    'Internal Server Error': 500
};


/* dict of all the *custom* error messages according to error that was found
during parsing request parsing. */
exports.customErrorMessages = {
    'OK': 'OK',
    'Bad Path Url' : 'Error, the requested file path is invalid',
    'Relative Path' : 'Error, the requested file path is relative',
    'Method Not Implemented' : 'Error, other methods then GET are not implemented',
    'Internal Server Error' : 'Error on the server or on the socket',
    'Not Found' : 'Error, the requested file does not exist',
    'Directory Path' :'Error, the requested file path is a directory',
    'HTTP Version Not Supported' : 'Error, this HTTP Version is not supported',
    'Unsupported Media Type': 'Error, the requested file is of unsupported media type',
    'Error File Reading' : 'Error, there was a failure while reading the file'
};

/* dict of all the supported media types - the file extensions */
exports.fileExtensions = {
    ".js" : "application/javascript",
    ".txt" : "text/plain",
    ".html" : "text/html",
    ".css" : "text/css",
    ".jpg" : "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif" : "image/gif",
    ".png" : "image/png",
    ".ico" : "image/x-icon",
    other : "application/octet-stream"
};

/* list of all the possible methods allowed */
exports.requestMethodTypes = ['GET', 'POST', 'CONNECT', 'DELETE', 'HEAD', 'PUT','TRACE', 'OPTIONS', 'PATCH'];