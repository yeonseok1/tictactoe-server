const { v4: uuidv4 } = require('uuid');

module.exports = function(server) {

    const io = require('socket.io')(server, {
        transports: ['websocket']
    });

    // �� ����
    var rooms = [];                 // ����
    var socketRooms = new Map();    // �����

    io.on('connection', (socket) => {

        // ���� ����
        console.log('A user connected:', socket.id);

        // ����
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

        // ����
        socket.on('leaveRoom', function (data) {
            var roomIJd = data.roomId;
            socket.leave(roomId);
            socket.emit('exitRoom');
            socket.to(roomId).emit('endGame');

            // ȥ�� �� �� ���� ��
            const roomIdx = rooms.indexOf(roomId);
            if (roomIdx !== -1) {
                rooms.splice(roomIdx, 1);
                console.log('Room deleted:', roomId);
            }

            // ���� �� ���� ���� ����
            socketRooms.delete(socket.id);
        });

        // Ư�� block�� ��ġ���� ��
        socket.on('doPlayer', function (playerInfo) {
            var roomId = playerInfo.roomId;
            var blockIndex = playerInfo.blockIndex;

            console.log('Player action in room:', roomId, 'Block index:', blockIndex);
            socket.to(roomId).emit('doOpponent', { blockIndex: blockIndex });
        });

    });
};