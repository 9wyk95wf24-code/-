// commands/warn.js
const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, hasPermission, NO_PERMISSION_MESSAGE } = require('../utils/permissions');
const { isAdmin } = require('../utils/adminStore');
const { addWarning } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('사용자에게 경고를 부여합니다.')
    .addUserOption((option) => option.setName('user').setDescription('경고할 사용자').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('경고 사유').setRequired(true)),

  async execute(interaction) {
    // Discord 서버 권한(ModerateMembers) 보유자 또는 봇 관리자/오너만 사용 가능
    const authorized = hasPermission(interaction.member, [PermissionFlagsBits.ModerateMembers]) || isAdmin(interaction.user.id);
    if (!authorized) {
      await interaction.reply({ content: NO_PERMISSION_MESSAGE, ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!reason || reason.trim().length === 0) {
      await interaction.reply({ content: '경고 사유를 입력해주세요.', ephemeral: true });
      return;
    }

    const warnings = addWarning(interaction.guild.id, targetUser.id, reason, interaction.user.id);

    await interaction.reply(
      `⚠️ **${targetUser.tag}**님에게 경고를 부여했습니다. (누적 ${warnings.length}회)\n사유: ${reason}`,
    );
    logger.moderation(`경고: ${targetUser.tag} by ${interaction.user.tag} - ${reason} (누적 ${warnings.length}회)`);
  },
};
