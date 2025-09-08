const { v4: uuidv4 } = require('uuid');

module.exports = function(server) {

    const io = require('socket.io')(server, {
        transports: ['websocket']
    });

    // 방 정보
    var rooms = [];                 // 대기방
    var socketRooms = new Map();    // 진행방

    io.on('connection', (socket) => {

        // 서버 구현
        console.log('A user connected:', socket.id);

        // 입장
        if (rooms.length > 0) {
            var roomId = rooms.shift();
            socket.join(roomId);
            socket.emit('joinRoom', { roomId: roomId });
            socket.to(roomId).emit('startGame', { roomId: roomId });
            socketRooms.set(socket.id, roomId);
        } else {
            var roomId = uuidv4();
            socket.join(roomId);
            socket.emit('createRoom', { roomId: roomId });
            rooms.push(roomId);
            socketRooms.set(socket.id, roomId);
        }

        // 퇴장
        socket.on('leaveRoom', function (data) {
            var roomIJd = data.roomId;
            socket.leave(roomId);
            socket.emit('exitRoom');
            socket.to(roomId).emit('endGame');

            // 혼자 들어간 방 나갈 때
            const roomIdx = rooms.indexOf(roomId);
            if (roomIdx !== -1) {
                rooms.splice(roomIdx, 1);
                console.log('Room deleted:', roomId);
            }

            // 나간 방 소켓 정보 삭제
            socketRooms.delete(socket.id);
        });

        // 특정 block을 터치했을 때
        socket.on('doPlayer', function (playerInfo) {
            var roomId = playerInfo.roomId;
            var blockIndex = playerInfo.blockIndex;

            console.log('Player action in room:', roomId, 'Block index:', blockIndex);
            socket.to(roomId).emit('doOpponent', { blockIndex: blockIndex });
        });

    });
};