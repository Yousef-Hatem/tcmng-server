const redis = require("redis");
const { createSpinner } = require("nanospinner");
const RedisCache = require("../utils/redis-cache");

const redisConnection = async () => {
  let connectionFailed;
  let connected = false;

  const spinner = createSpinner("Connect to Redis").start();

  const redisClient = redis.createClient({ url: process.env.REDIS_URL });

  redisClient.on("error", (err) => {
    if (!connectionFailed) {
      connectionFailed = true;
      spinner.error({ text: `Redis ${err}` });
    }
  });

  redisClient.on("ready", async () => {
    try {
      if (connectionFailed && connected) {
        await redisClient.set("states", "OK", { EX: 1, NX: true });
        connectionFailed = false;
        spinner.success({ text: `Redis Reconnected` });
      }
    } catch (err) {
      if (!connectionFailed) {
        console.error(err);
      }
    }
  });

  await redisClient.connect();
  connected = true;
  connectionFailed = false;
  spinner.success({ text: `Redis Connected` });
  new RedisCache().setRedisClient(redisClient);
};

module.exports = redisConnection;
