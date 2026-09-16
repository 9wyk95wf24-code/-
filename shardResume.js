// events/shardResume.js
// 끊겼던 연결이 복구되면 로그를 남깁니다.

const logger = require('../utils/logger');

module.exports = {
  name: 'shardResume',
  once: false,
  execute(shardId, replayedEvents) {
    logger.status(`연결 복구됨 (shardId: ${shardId}, 재생된 이벤트: ${replayedEvents})`);
  },
};
