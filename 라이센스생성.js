// commands-prefix/라이센스생성.js
// "!라이센스생성" - 오너 전용. !관리자등록에 쓸 1회용 라이선스 코드(diton_XXXXXX)를 발급합니다.
// (요청하신 "!관리자등록"이 실제로 동작하려면 누군가 라이선스를 발급해줄 방법이 필요해서 추가한 명령어입니다.)
// 노출을 줄이기 위해 채널이 아닌 오너 본인 DM으로 코드를 전송합니다.

const { isOwner, issueLicense } = require('../utils/adminStore');
const logger = require('../utils/logger');

module.exports = {
  name: '라이센스생성',
  description: '관리자 등록용 라이선스 코드를 발급합니다. (오너 전용)',

  async execute(message) {
    if (!isOwner(message.author.id)) {
      await message.reply('이 명령어는 오너만 사용할 수 있습니다.');
      return;
    }

    const code = issueLicense(message.author.id);

    try {
      await message.author.send(
        `🔑 새 관리자 라이선스 코드가 발급되었습니다: \`${code}\`\n등록할 사람이 서버에서 \`!관리자등록 ${code}\`를 입력하면 관리자로 등록됩니다. (1회용)`,
      );
      await message.reply('✅ 라이선스 코드를 DM으로 전송했습니다.');
    } catch (err) {
      logger.warn(`라이선스 코드 DM 전송 실패 (DM 차단 가능): ${message.author.tag}`);
      await message.reply(
        `⚠️ DM 전송에 실패해서 여기로 대신 안내드립니다: \`${code}\` (이 메시지는 잠시 후 자동으로 삭제됩니다)`,
      );
      // DM이 막혀 채널에 코드가 노출된 경우, 잠시 후 메시지를 삭제해 노출을 최소화합니다.
      setTimeout(() => {
        message.channel.messages
          .fetch({ limit: 5 })
          .then((msgs) => {
            const target = msgs.find((m) => m.author.id === message.client.user.id && m.content.includes(code));
            if (target) target.delete().catch(() => null);
          })
          .catch(() => null);
      }, 10000);
    }

    logger.moderation(`라이선스 발급: ${message.author.tag}`);
  },
};
