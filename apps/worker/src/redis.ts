import { Redis } from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl);

export const LIVE_UPDATE_CHANNEL = 'match:live-update';
