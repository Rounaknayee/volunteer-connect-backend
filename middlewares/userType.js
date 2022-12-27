var express = require('express');

var router = express.Router();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.use(async function (req, res, next) {
    if (!req.decoded){
        return res.status(401).json({ error: 'User not authenticated' });
    }
    else {
        let user_email = req.decoded.username;
        const user = await prisma.users.findUnique({
            where: {
                email: user_email,
            }
        });
        user.id = Number(user.id.toString().replace('n', ''));
        if (user) {
            req.decoded.user_type = user.user_type;
            req.decoded.user_id = user.id;
            next();
        }
        else {
            return res.status(401).json({ error: 'User not authenticated' });
        }
    }
});

module.exports = router;