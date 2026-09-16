// events/voiceStateUpdate.js
// 음성채널 입장/퇴장/이동을 감지해 활동(접속 시간)을 추적합니다.

const logger = require('../utils/logger');
const { handleVoiceStateUpdate } = require('../utils/activityTracker');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute(oldState, newState) {
    try {
      handleVoiceStateUpdate(oldState, newState);
    } catch (err) {
      logger.error('voiceStateUpdate 처리 중 오류', err);
    }
  },
};
