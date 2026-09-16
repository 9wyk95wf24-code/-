// commands-prefix/활동초기화.js
// "!활동초기화" - 서버 전체 활동(메시지 수 / 음성채널 시간) 기록을 즉시 초기화합니다.
// 매일 자정에 자동으로도 초기화되지만, 관리자가 수동으로 즉시 초기화할 때 사용합니다.
// 현재 음성채널에 접속 중인 사용자의 "진행 중인 활동"도 이 시점 기준으로 함께 초기화됩니다.

const { PermissionFlagsBits, hasPermission, NO_PERMISSION_MESSAGE } = require('../utils/permissions');
const { isAdmin } = require('../utils/adminStore');
const { resetActivity } = require('../utils/activityTracker');
const logger = require('../utils/logger');

module.exports = {
  name: '활동초기화',
  description: '서버의 활동(메시지/음성) 기록을 즉시 초기화합니다. (ManageGuild 권한 또는 봇 관리자/오너)',

  async execute(message) {
    if (!message.guild) return;

    const authorized = hasPermission(message.member, [PermissionFlagsBits.ManageGuild]) || isAdmin(message.author.id);
    if (!authorized) {
      await message.reply(NO_PERMISSION_MESSAGE);
      return;
    }

    try {
      resetActivity(message.guild.id);
      await message.reply('✅ 이 서버의 활동 기록(메시지/음성)을 초기화했습니다. 현재 진행 중인 활동도 함께 초기화되었습니다.');
      logger.moderation(`활동 수동 초기화(접두사): ${message.author.tag} - 서버 ${message.guild.id}`);
    } catch (err) {
      logger.error('활동 초기화(접두사) 처리 중 오류', err);
      await message.reply('활동 초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  },
};
