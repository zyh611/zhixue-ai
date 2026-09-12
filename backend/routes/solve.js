const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const AipOcrClient = require('baidu-aip-sdk').ocr;
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const APP_ID = '7950446';
const API_KEY = 'Rtdj6o5tYAGaG4PZsvI9Vk1D';
const SECRET_KEY = 'MEPYOgntmDVfXH8Wg7ldwWlKdorkk2xj';
const ocrClient = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '请先登录' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token 已过期' });
    }
};

router.post('/', authMiddleware, async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length === 0) return res.status(400).json({ success: false, message: '请输入题目' });

    try {
        const response = await axios.post(process.env.DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: '你是专业的解题助手。请严格根据用户给出的题目文字进行解答，不要推测原题、不要补充缺失信息、不要展示思考过程、不要出现"可能是""我推测""原题应为"等表述。直接从"详细步骤"开始输出，不要输出"解题思路"。格式：\n📐详细步骤\n🎯答案\n💡知识点\n用中文。' },
                { role: 'user', content: question }
            ],
            temperature: 0.3, max_tokens: 2000
        }, {
            headers: { 'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json' }
        });
        res.json({ success: true, question, answer: response.data.choices[0].message.content, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('API调用失败:', error.message);
        res.json({ success: true, question, answer: '📐 步骤：1.理解 2.公式 3.计算\n🎯 答案：42\n⚠️ 模拟模式', isMock: true });
    }
});

router.post('/chat', authMiddleware, async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length === 0) return res.status(400).json({ success: false, message: '请输入内容' });

    try {
        const response = await axios.post(process.env.DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'user', content: question }
            ],
            temperature: 0.7, max_tokens: 2000
        }, {
            headers: { 'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json' }
        });
        res.json({ success: true, answer: response.data.choices[0].message.content });
    } catch (error) {
        console.error('对话调用失败:', error.message);
        res.json({ success: false, message: '调用失败：' + error.message });
    }
});

router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传图片' });

    try {
        const ocrResult = await ocrClient.accurateBasic(req.file.buffer.toString('base64'));
        if (ocrResult.error_code && ocrResult.error_code !== 0) {
            return res.json({ success: false, message: 'OCR识别失败：' + ocrResult.error_msg });
        }
        const words = ocrResult.words_result || [];
        const text = words.map(w => w.words).join('\n');
        if (!text.trim()) return res.json({ success: false, message: '未能识别图片中的文字' });
        res.json({ success: true, ocrText: text });
    } catch (error) {
        console.error('OCR识别失败:', error.message);
        res.json({ success: false, message: '识别失败：' + error.message });
    }
});

router.get('/history', authMiddleware, (req, res) => {
    res.json({
        success: true,
        records: [
            { id: 1, question: '求方程 x²-5x+6=0 的解', answer: 'x₁=2, x₂=3', createdAt: '2024-01-15 14:30' },
            { id: 2, question: '三角形两边3和4夹角60°求第三边', answer: '√13 ≈ 3.61', createdAt: '2024-01-15 10:20' }
        ], total: 2
    });
});

module.exports = router;