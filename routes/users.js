var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var saltRounds = 10;
const { ObjectId } = require('mongodb');

var ResponseType = {
    INVALID_USERNAME: 0,
    INVALID_PASSWORD: 1,
    SUCCESS: 2,
}

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

// ȸ������
router.post('/signup', async function (req, res, next) {
    try {
        var username = req.body.username;
        var password = req.body.password;
        var nickname = req.body.nickname;

        // �Է°� ����
        if (!username || !password || !nickname) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // DB ����
        var database = req.app.get('database');
        var users = database.collection('users');

        // �ߺ��� username Ȯ��
        var existingUser = await users.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ result: ResponseType.INVALID_USERNAME });
        }

        // ��й�ȣ ��ȣȭ
        var salt = bcrypt.genSaltSync(saltRounds);
        var hash = bcrypt.hashSync(password, salt);

        // DB�� ����� ���� ����
        await users.insertOne({
            username: username,
            password: hash,
            nickname: nickname,
            createdAt: new Date()
        });

        res.status(201).json({ result: ResponseType.SUCCESS });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// �α���
router.post('/signin', async function (req, res, next) {
    try {
        var username = req.body.username;
        var password = req.body.password;

        // �Է°� ����
        if (!username || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // DB ����
        var database = req.app.get('database');
        var users = database.collection('users');

        // ����� ��ȸ
        const existingUser = await users.findOne({ username: username });
        if (existingUser) {
            var compareResult = bcrypt.compareSync(password, existingUser.password);
            if (compareResult) {
                // ���ǿ� ����� ���� ����
                req.session.isAuthenticated = true;
                req.session.userId = existingUser._id.toString();
                req.session.username = existingUser.username;
                req.session.nickname = existingUser.nickname;
                res.json({ result: ResponseType.SUCCESS });
            } else {
                res.status(401).json({ result: ResponseType.INVALID_PASSWORD });
            }
        } else {
            res.status(401).json({ result: ResponseType.INVALID_USERNAME });
        }
    } catch (error) {
        console.error('Error during signin:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// �α׾ƿ�
router.get('/signout', function (req, res, next) {
    if (req.session) {
        // ���� ����
        req.session.destroy(function (err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to log out.' });
            } else {
                return res.json({ message: 'Logged out successfully.' });
            }
        });
    } else {
        res.json({ message: 'No active session.' });
    }
});

// ������ ���� ������Ʈ
router.post('/addscore', async function (req, res, next) {
    try {
        if (!req.session.isAuthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        var userId = req.session.userId;
        var score = req.body.score;

        if (!score || isNaN(score)) {
            return res.status(400).json({ message: 'Invalid score' });
        }

        var database = req.app.get('database');
        var users = database.collection('users');

        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    score: Number(score),
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Score updated successfully' });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ���� ��ȸ
router.get('/score', async function (req, res, next) {
    try {

        if (!req.session.isAuthenticated) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        var userId = req.session.userId;

        var database = req.app.get('database');
        var users = database.collection('users');

        const user = await users.findOne(
            { _id: new ObjectId(userId) }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user._id.toString(),
            username: user.username,
            nickname: user.nickname,
            score: user.score || 0
        });

    } catch (error) {
        console.error('Error fetching score:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;