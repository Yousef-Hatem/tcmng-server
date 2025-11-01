let redisClient;
class RedisCache {
  startKey;

  constructor(key = "") {
    this.startKey = key;
    if (this.startKey) {
      this.startKey += "-";
    }
  }

  setRedisClient(client) {
    if (!redisClient) {
      redisClient = client;
    } else {
      throw Error("Redis client already exists");
    }
  }

  async set(key, value, expire = 900) {
    key = this.startKey + key;
    const status = await redisClient.set(key, JSON.stringify(value), {
      EX: expire,
      NX: true,
    });
    return status;
  }

  async get(key) {
    key = this.startKey + key;
    const value = await redisClient.get(key);
    return JSON.parse(value);
  }

  async delete(keys) {
    if (Array.isArray(keys)) {
      keys = keys.map((key) => this.startKey + key);
    } else {
      keys = this.startKey + keys;
    }

    const status = await redisClient.del(keys);
    return status;
  }
}

module.exports = RedisCache;
