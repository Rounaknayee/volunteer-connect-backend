var express = require('express');

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const isTokenBlacklisted = require('../misc/redis').isTokenBlacklisted;

dotenv.config();

var router = express.Router();

router.use(async function (req, res, next) {
    const token = req.headers['x-access-token'];
    if (token) {
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        jwt.verify(token, process.env.TOKEN_SECRET, function (err, decoded) {
            if (err) {
                return res.status(401).json({ error: 'Invalid token' });
            } else {
                req.decoded = decoded;
                next();
            }
        }); 
    } else {
        return res.status(401).json({ error: 'No token provided' });
    }
});

module.exports = router;