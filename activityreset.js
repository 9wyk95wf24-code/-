// commands/activityreset.js
// "/활동초기화" - !활동초기화와 동일한 기능의 슬래시 명령어 버전입니다.

const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, hasPermission, NO_PERMISSION_MESSAGE } = require('../utils/permissions');
const { isAdmin } = require('../utils/adminStore');
const { resetActivity } = require('../utils/activityTracker');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('활동초기화')
    .setDescription('서버의 활동(메시지/음성) 기록을 즉시 초기화합니다. (관리자 전용)'),

  async execute(interaction) {
    const authorized = hasPermission(interaction.member, [PermissionFlagsBits.ManageGuild]) || isAdmin(interaction.user.id);
    if (!authorized) {
      await interaction.reply({ content: NO_PERMISSION_MESSAGE, ephemeral: true });
      return;
    }

    resetActivity(interaction.guild.id);
    await interaction.reply('✅ 이 서버의 활동 기록(메시지/음성)을 초기화했습니다. 현재 진행 중인 활동도 함께 초기화되었습니다.');
    logger.moderation(`활동 수동 초기화(슬래시): ${interaction.user.tag} - 서버 ${interaction.guild.id}`);
  },
};
