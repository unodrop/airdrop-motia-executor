/**
 * Redis client. Caller passes url or uses REDIS_URL from env.
 */

import Redis from 'ioredis'

export type RedisClient = Redis

/**
 * Create a Redis client. Pass url or omit to use process.env.REDIS_URL.
 */
export function getRedisClient(url?: string): Redis {
  const u = url ?? process.env.REDIS_URL
  if (!u) throw new Error('Redis URL required: pass url or set REDIS_URL')
  return new Redis(u)
}
