// events/messageCreate.js
// 접두사(!) 명령어 처리, 메시지 릴레이, 활동(메시지 수) 추적,
// 스팸 방지, 링크 필터, 금칙어 필터를 순서대로 처리합니다.
// 각 기능은 독립적으로 try/catch 처리되어, 하나가 실패해도 나머지와 봇 전체에는 영향이 없습니다.

const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');
const { relayMessage } = require('../utils/relay');
const { recordAndCheckSpam, handleSpam } = require('../utils/spamGuard');
const { containsDisallowedLink } = require('../utils/linkFilter');
const { containsBadWord } = require('../utils/wordFilter');
const { trackMessage } = require('../utils/activityTracker');
const { hasPermission, NO_PERMISSION_MESSAGE } = require('../utils/permissions');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // 0) 접두사(!) 명령어 처리 - 명령어 메시지는 릴레이/필터/활동 집계 대상에서 제외합니다.
    const prefix = process.env.PREFIX || '!';
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift();
      const prefixCommand = message.client.prefixCommands?.get(commandName);

      if (prefixCommand) {
        try {
          if (prefixCommand.permissions && !hasPermission(message.member, prefixCommand.permissions)) {
            await message.reply(NO_PERMISSION_MESSAGE);
            return;
          }
          logger.command(`!${commandName} 실행 - ${message.author.tag}`);
          await prefixCommand.execute(message, args);
        } catch (err) {
          logger.error(`!${commandName} 실행 중 오류`, err);
          await message.reply('명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.').catch(() => null);
        }
        return;
      }
      // 등록되지 않은 접두사 명령어는 일반 메시지로 간주하고 아래 로직을 계속 진행합니다.
    }

    // 1) 메시지 릴레이 (항상 우선 시도 - 기존 핵심 기능)
    try {
      await relayMessage(message);
    } catch (err) {
      logger.error('릴레이 처리 중 오류', err);
    }

    // 2) 활동(메시지 수) 추적
    try {
      trackMessage(message.guild.id, message.author.id);
    } catch (err) {
      logger.error('메시지 활동 추적 중 오류', err);
    }

    let settings;
    try {
      settings = getGuildSettings(message.guild.id);
    } catch (err) {
      logger.error('서버 설정 로드 실패', err);
      return;
    }

    // 관리자는 필터 예외 처리 (ManageMessages 권한 보유 시 필터 통과)
    const isModerator = message.member?.permissions?.has('ManageMessages');

    // 3) 링크 필터
    try {
      if (
        !isModerator &&
        settings.linkFilterEnabled &&
        containsDisallowedLink(message.content, settings.linkFilterAllowedDomains)
      ) {
        await message.delete().catch(() => null);
        await message.channel
          .send(`${message.author}, 허용되지 않은 링크는 게시할 수 없습니다.`)
          .then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
        logger.moderation(`링크 필터에 의해 삭제됨: ${message.author.tag} - ${message.content}`);
        return;
      }
    } catch (err) {
      logger.error('링크 필터 처리 중 오류', err);
    }

    // 4) 금칙어 필터
    try {
      if (!isModerator && settings.badWordFilterEnabled && containsBadWord(message.content, settings.badWords)) {
        await message.delete().catch(() => null);
        await message.channel
          .send(`${message.author}, 금칙어가 포함된 메시지는 삭제되었습니다.`)
          .then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
        logger.moderation(`금칙어 필터에 의해 삭제됨: ${message.author.tag}`);
        return;
      }
    } catch (err) {
      logger.error('금칙어 필터 처리 중 오류', err);
    }

    // 5) 스팸 방지
    try {
      if (!isModerator && recordAndCheckSpam(message)) {
        await handleSpam(message);
      }
    } catch (err) {
      logger.error('스팸 방지 처리 중 오류', err);
    }
  },
};
