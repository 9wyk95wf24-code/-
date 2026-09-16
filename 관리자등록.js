// commands-prefix/관리자등록.js
// "!관리자등록 diton_XXXXXX" - 오너가 발급한 라이선스 코드를 등록해서 관리자가 됩니다.

const { redeemLicense } = require('../utils/adminStore');
const logger = require('../utils/logger');

module.exports = {
  name: '관리자등록',
  description: '라이선스 코드를 등록해서 관리자가 됩니다.',

  async execute(message, args) {
    const code = args[0];

    if (!code) {
      await message.reply('사용법: `!관리자등록 diton_XXXXXX`');
      return;
    }

    const result = redeemLicense(code, message.author.id);

    if (!result.success) {
      const reasons = {
        INVALID_FORMAT: '올바른 라이선스 코드 형식이 아닙니다. (예: diton_123456)',
        ALREADY_ADMIN: '이미 관리자 또는 오너입니다.',
        NOT_FOUND: '유효하지 않거나 이미 사용된 라이선스 코드입니다.',
      };
      await message.reply(`❌ ${reasons[result.reason] || '라이선스 등록에 실패했습니다.'}`);
      return;
    }

    await message.reply('✅ 관리자로 등록되었습니다! `!관리자패널`에서 사용 가능한 기능을 확인해보세요.');
    logger.moderation(`관리자 등록: ${message.author.tag} (${message.author.id})`);

    // 코드가 채팅에 노출됐을 수 있으니 원본 명령어 메시지는 삭제해서 재사용 시도를 막습니다.
    await message.delete().catch(() => null);
  },
};
