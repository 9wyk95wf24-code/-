// utils/logger.js
// 콘솔 로그 포맷을 통일합니다: [STATUS] [COMMAND] [MODERATION] [ERROR] [WARN] [LOG]

function timestamp() {
  return new Date().toISOString();
}

function base(tag, message) {
  console.log(`[${tag}] ${timestamp()} ${message}`);
}

module.exports = {
  status: (message) => base('STATUS', message),
  command: (message) => base('COMMAND', message),
  moderation: (message) => base('MODERATION', message),
  error: (message, err) => {
    console.error(`[ERROR] ${timestamp()} ${message}`, err || '');
  },
  warn: (message) => base('WARN', message),
  log: (message) => base('LOG', message),
};
