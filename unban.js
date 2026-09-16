// commands/unban.js
const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('차단된 사용자를 해제합니다.')
    .addStringOption((option) => option.setName('userid').setDescription('차단 해제할 사용자 ID').setRequired(true)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.BanMembers])) return;

    const userId = interaction.options.getString('userid');

    // 사용자 입력값 검증: 숫자로만 이루어진 Discord ID 형식인지 확인
    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({ content: '올바른 사용자 ID 형식이 아닙니다.', ephemeral: true });
      return;
    }

    try {
      await interaction.guild.members.unban(userId);
      await interaction.reply(`✅ ID **${userId}** 사용자의 차단을 해제했습니다.`);
      logger.moderation(`차단 해제: ${userId} by ${interaction.user.tag}`);
    } catch (err) {
      await interaction.reply({ content: '차단 목록에서 해당 사용자를 찾을 수 없습니다.', ephemeral: true });
    }
  },
};
