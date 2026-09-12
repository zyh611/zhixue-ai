const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const users = [
    {
        id: 1,
        username: 'student',
        password: bcrypt.hashSync('123456', 10),
        solvedCount: 23,
        accuracy: 87,
        streak: 7
    },
    {
        id: 2,
        username: 'teacher',
        password: bcrypt.hashSync('123456', 10),
        solvedCount: 156,
        accuracy: 95,
        streak: 30
    }
];

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: '用户名和密码不能为空'
        });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
        });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: '用户名或密码错误'
        });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        message: '登录成功',
        token,
        user: {
            id: user.id,
            username: user.username,
            solvedCount: user.solvedCount,
            accuracy: user.accuracy,
            streak: user.streak
        }
    });
});

router.get('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: '未登录' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = users.find(u => u.id === decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                solvedCount: user.solvedCount,
                accuracy: user.accuracy,
                streak: user.streak
            }
        });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token 已过期，请重新登录' });
    }
});

module.exports = router;