var express = require('express');
const { PrismaClient } = require("@prisma/client");
const Joi = require('joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var router = express.Router();
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const jwtMiddleware = require('../middlewares/jwt');
const { createClient } = require('redis');

dotenv.config();

const redis = createClient({ url: process.env.REDIS_URL});

const prisma = new PrismaClient();
  

function generateAccessToken(username, remember) {
    if (remember) {
        return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '259200s' });
    }
    return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '3600s' });
}
  
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({ title: 'Volunteer Connection' });
  return;
});

router.get('/verify', jwtMiddleware, async function(req, res, next) {
    res.json({ message: 'Token verified' , user: req.decoded});
    return;
});

router.post('/login', async function(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        remember: Joi.boolean().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return
    }

    const user = await prisma.users.findUnique({
        where: {
            email: value.email,
        }
    });

    if (user) {
        const match = await bcrypt.compare(value.password, user.password);
        if (match) {
            const token = generateAccessToken({ username: user.email }, value.remember);
            res.status(200).json({ message: 'Login successful' , token: token, user_type: user.user_type});
            return;
        } else {
            res.status(401).json({ error: 'Invalid credentials specified' });
            return;
        }
    }
    else {
        res.status(401).json({ error: 'Invalid credentials specified' });
        return;
    }

});

router.get('/logout', async function(req, res, next) {
    const token = req.headers['x-access-token'];
    const decoded = jwt.decode(token);
    const maxAge = decoded.exp - decoded.iat;
    await redis.connect();
    await redis.set(token, 'true');
    await redis.expire(token, maxAge);
    await redis.quit();
    res.json({ message: 'Logout successful' });
    return;
});

router.post('/register', async function(req, res, next) {

    const roles = ['admin', 'volunteer', 'coordinator'];

    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        phone: Joi.string().min(10).required(),
        address: Joi.string().min(1).required(),
        city: Joi.string().min(1).required(),
        state: Joi.string().min(1).required(),
        zip: Joi.string().min(1).required(),
        country: Joi.string().min(1).required(),
        age: Joi.number().min(18).required(),
        marketing: Joi.boolean().required(),
        company: Joi.string().min(0).optional(),
        employee_id: Joi.string().min(0).optional(),
        user_type: Joi.any().valid(...roles).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return;
    }

    if (value.user_type === 'coordinator') {
        if (!value.company || !value.employee_id) {
            res.status(422).json({ error: 'Company and Employee ID are required for coordinator' });
            return;
        }
    }
        
    value['password'] = bcrypt.hashSync(value['password'], saltRounds);

    try {
        const users = await prisma.users.create({
            data: value,
        });
        res.status(200).json({ message: 'User created successfully' });
        return;
    } catch (err) {
        if (err.code === 'P2002') {
            res.status(401).json({ error: 'Email already exists' });
            return;
        }
        else {
            res.status(401).json({ error: err.message });
            return;
        }
    }
});

router.get('/getprofile', jwtMiddleware, async function(req, res, next) {
    const user = await prisma.users.findUnique({
        select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            age: true,
            marketing: true,
            company: true,
            employee_id: true,
            user_type: true,
        },
        where: {
            email: req.decoded.username,
        }
    });
    res.json({ user: user });
    return;
});

router.post('/updateprofile', jwtMiddleware, async function(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        phone: Joi.string().min(10).required(),
        address: Joi.string().min(1).required(),
        city: Joi.string().min(1).required(),
        state: Joi.string().min(1).required(),
        zip: Joi.string().min(1).required(),
        country: Joi.string().min(1).required(),
        marketing: Joi.boolean().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return;
    }

    try {
        const users = await prisma.users.update({
            where: {
                email: req.decoded.username,
            },
            data: value,
        });
        res.status(200).json({ message: 'User updated successfully' });
        return;
    }
    catch (err) {
        res.status(401).json({ error: err.message });
        return;
    }
});

router.post('/updatepassword', jwtMiddleware, async function(req, res, next) {
    const schema = Joi.object({
        old_password: Joi.string().min(8).required(),
        new_password: Joi.string().min(8).required(),
        new_password_confirm: Joi.string().min(8).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return;
    }

    if (value.new_password !== value.new_password_confirm) {
        res.status(422).json({ error: 'New passwords do not match' });
        return;
    }

    const user = await prisma.users.findUnique({
        where: {
            email: req.decoded.username,
        }
    });

    if (user) {
        const match = await bcrypt.compare(value.old_password, user.password);
        if (match) {
            const users = await prisma.users.update({
                where: {
                    email: req.decoded.username,
                },
                data: {
                    password: bcrypt.hashSync(value.new_password, saltRounds),
                }
            });
            res.status(200).json({ message: 'Password updated successfully' });
            return;
        } else {
            res.status(401).json({ error: 'Invalid credentials specified' });
            return;
        }
    }
});

module.exports = router;
