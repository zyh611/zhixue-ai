const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: __dirname + '/.env' });

const authRoutes = require('./routes/auth');
const solveRoutes = require('./routes/solve');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

app.use('/api/auth', authRoutes);
app.use('/api/solve', solveRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
    console.log('🚀 智学AI 服务已启动: http://localhost:' + PORT);
});