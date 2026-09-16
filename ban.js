// commands/ban.js
const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('사용자를 서버에서 차단합니다.')
    .addUserOption((option) => option.setName('user').setDescription('차단할 사용자').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('차단 사유').setRequired(false)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.BanMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || '사유 없음';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({ content: '이 사용자는 권한 문제로 차단할 수 없습니다.', ephemeral: true });
      return;
    }

    await interaction.guild.members.ban(targetUser.id, { reason });
    await interaction.reply(`✅ **${targetUser.tag}**님을 차단했습니다. 사유: ${reason}`);
    logger.moderation(`차단: ${targetUser.tag} by ${interaction.user.tag} - ${reason}`);
  },
};
