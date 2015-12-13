var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');

var listenPort = 25252;
var keywordFile = 'keywords.txt';
// http://stackoverflow.com/q/4351521/
if (process.argv.length >= 3) {
    for (var i = 0; i < process.argv.length - 1; ++i) {
        if (process.argv[i] === '-p')
            listenPort = parseInt(process.argv[i + 1]);
        else if (process.argv[i] === '-k')
            keywordFile = process.argv[i + 1];
    }
}

var passcode = '';
var hex_random = function () {
    var s = Math.floor(Math.random() * 2147483648).toString(16);
    while (s.length < 8) s = '0' + s;
    return s;
};
var passcode_regen = function () {
    passcode = hex_random() + hex_random() + hex_random() + hex_random();
    console.info('Current passcode: ' + passcode);
};
passcode_regen();
var passcodeTimer = setInterval(passcode_regen, 60000);

app.use('/static', express.static(__dirname + '/static'));
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/static/admin.html');
});
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/send.html');
});

// Load keywords for filtering
var keywordData = fs.readFileSync(keywordFile, { encoding: 'utf-8' }).split('\n');
var keywords = [];
var keywordReason = '[AUTO] Contains sensitive keywords ←_←';
var keywordCaseSensitive = false;
for (var i = 0; i < keywordData.length; ++i) if (keywordData[i] != '') {
    if (keywordData[i][0] === '#') {
        var s = keywordData[i].substr(1);
        if (s === 'case-sensitive') keywordCaseSensitive = true;
        else if (s === 'case-insensitive') keywordCaseSensitive = false;
        else keywordReason = s;
    } else {
        if (!keywordCaseSensitive) keywordData[i] = keywordData[i].toUpperCase();
        keywords.push({
            text: keywordData[i], reason: keywordReason,
            caseSensitive: keywordCaseSensitive
        });
    }
}

// TODO: Make use of SocketIO's group mechanism
var adminSocket = null;
var dispSocket = null;
var comments = [];
var commentsAcc = [];
// NOTE: Should an array be used to store all the sockets??
// http://stackoverflow.com/q/8467784

io.on('connection', function (socket) {
    socket.isAdmin = false;
    socket.isDisp = false;
    socket.on('disconnect', function () {
        if (socket.isAdmin) {
            console.info('Administrator disconnected!');
            adminSocket = null;
            passcode_regen();
            passcodeTimer = setInterval(passcode_regen, 60000);
        }
        if (socket.isDisp) {
            console.info('Displayer disconnected!');
            dispSocket = null;
        }
    });
    socket.on('verify', function (psw) {
        if (!adminSocket && psw === passcode) {
            console.info('Administrator connected!');
            socket.isAdmin = true;
            adminSocket = socket;
            clearTimeout(passcodeTimer);
            // Clear accumulated comments
            for (var c in commentsAcc) socket.emit('comment', commentsAcc[c]);
            commentsAcc = [];
        }
        if (socket.isAdmin) {
            socket.emit('verifyResult', 'ok');
        } else {
            socket.emit('verifyResult', 'QwQ');
        }
    });
    socket.on('registAsDisp', function () {
        if (!dispSocket) {
            console.info('Displayer connected!');
            socket.isDisp = true;
            dispSocket = socket;
        }
        if (socket.isDisp) {
            socket.emit('registResult', 'ok');
        } else {
            socket.emit('registResult', 'QwQ');
        }
    });
    socket.on('comment', function (cmt) {
        cmt.id = comments.length;
        socket.emit('commentReceived', cmt);
        cmt.author = socket.id;
        cmt.kwFiltered = false;
        // Check for keywords
        var upcase = cmt.text.toUpperCase();
        for (var i = 0; i < keywords.length; ++i) {
            if ((!keywords[i].caseSensitive && upcase.indexOf(keywords[i].text) !== -1)
                || cmt.text.indexOf(keywords[i].text) !== -1)
            {
                cmt.kwFiltered = true;
                cmt.kwReason = keywords[i].reason;
                break;
            }
        }
        comments.push(cmt);
        if (adminSocket) {
            adminSocket.emit('comment', cmt);
        } else {
            commentsAcc.push(cmt);
        }
    });
    socket.on('accept', function (data) {
        if (socket.isAdmin) {
            console.log(comments[data.id]);
            if (io.sockets.connected[comments[data.id].author])
                io.sockets.connected[comments[data.id].author].emit('commentAccepted', data);
            if (dispSocket) dispSocket.emit('comment', comments[data.id]);
        }
    });
    socket.on('reject', function (data) {
        if (socket.isAdmin) {
            if (io.sockets.connected[comments[data.id].author])
                io.sockets.connected[comments[data.id].author].emit('commentRejected', data);
        }
    });
});

server.listen(listenPort, function () {
    console.log('Started at http://*:' + listenPort + '/');
});