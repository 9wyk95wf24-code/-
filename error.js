// events/error.js
// 클라이언트 레벨 오류를 잡아 로그만 남기고 프로세스는 계속 실행되게 합니다.

const logger = require('../utils/logger');

module.exports = {
  name: 'error',
  once: false,
  execute(err) {
    logger.error('Discord 클라이언트 오류 발생', err);
  },
};
