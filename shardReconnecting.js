// events/shardReconnecting.js
// Discord 연결이 끊겨 재연결을 시도할 때 로그를 남깁니다.

const logger = require('../utils/logger');

module.exports = {
  name: 'shardReconnecting',
  once: false,
  execute(shardId) {
    logger.warn(`샤드 재연결 시도 중... (shardId: ${shardId})`);
  },
};
