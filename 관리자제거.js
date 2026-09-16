// commands-prefix/관리자제거.js
// "!관리자제거 @유저 비밀번호" - 오너 비밀번호(OWNER_PASSWORD 환경변수)가 맞을 때만 관리자를 제거합니다.
// 보안 참고: 비밀번호를 채팅으로 직접 입력하는 방식이라, 채널 로그나 다른 사람의 화면에
// 비밀번호가 노출될 수 있습니다. 이 명령어 사용 후에는 원본 메시지를 즉시 삭제하도록 구현했지만,
// 가능하면 봇과의 DM에서 사용하시고, 비밀번호도 주기적으로 교체하시길 권장드립니다.

const { removeAdmin } = require('../utils/adminStore');
const logger = require('../utils/logger');

module.exports = {
  name: '관리자제거',
  description: '오너 비밀번호로 관리자를 제거합니다.',

  async execute(message, args) {
    // 비밀번호 노출을 줄이기 위해 먼저 원본 메시지를 삭제 시도 (서버 채널인 경우, 권한 있으면)
    await message.delete().catch(() => null);

    const targetUser = message.mentions.users.first();
    const password = args.find((a) => !a.startsWith('<@'));

    if (!targetUser || !password) {
      const notice = await message.channel.send('사용법: `!관리자제거 @유저 오너비밀번호`').catch(() => null);
      if (notice) setTimeout(() => notice.delete().catch(() => null), 5000);
      return;
    }

    const result = removeAdmin(targetUser.id, password);

    if (!result.success) {
      const reasons = {
        PASSWORD_NOT_CONFIGURED: '오너 비밀번호(OWNER_PASSWORD)가 아직 설정되어 있지 않습니다.',
        WRONG_PASSWORD: '비밀번호가 올바르지 않습니다.',
        CANNOT_REMOVE_OWNER: '오너는 이 명령어로 제거할 수 없습니다.',
        NOT_ADMIN: '해당 사용자는 관리자가 아닙니다.',
      };
      const notice = await message.channel.send(`❌ ${reasons[result.reason] || '관리자 제거에 실패했습니다.'}`).catch(() => null);
      if (notice) setTimeout(() => notice.delete().catch(() => null), 5000);
      logger.moderation(`관리자 제거 실패(${result.reason}): 대상 ${targetUser.tag} by ${message.author.tag}`);
      return;
    }

    const notice = await message.channel.send(`✅ **${targetUser.tag}**님을 관리자에서 제거했습니다.`).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => null), 5000);
    logger.moderation(`관리자 제거: ${targetUser.tag} by ${message.author.tag}`);
  },
};
