const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL, // or just 'redis://localhost:6379' for local
});

redisClient.connect().catch(console.error);

module.exports = redisClient;