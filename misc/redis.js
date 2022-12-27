const dotenv = require('dotenv');
const { createClient } = require('redis');

dotenv.config();


const redis = createClient({ url: process.env.REDIS_URL });

async function isTokenBlacklisted(token){
    try {
        await redis.connect();
        const response = await redis.get(token);
        await redis.quit();
        if (response === null) {
            return false;
        }
        else {
            return true;
        }
    }
    catch (err) {
        console.log(err);
        return false;
    }
};

module.exports = {
    isTokenBlacklisted
};