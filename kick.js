// commands/kick.js
const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('사용자를 서버에서 추방합니다.')
    .addUserOption((option) => option.setName('user').setDescription('추방할 사용자').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('추방 사유').setRequired(false)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.KickMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || '사유 없음';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: '해당 사용자를 서버에서 찾을 수 없습니다.', ephemeral: true });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({ content: '이 사용자는 권한 문제로 추방할 수 없습니다.', ephemeral: true });
      return;
    }

    await member.kick(reason);
    await interaction.reply(`✅ **${targetUser.tag}**님을 추방했습니다. 사유: ${reason}`);
    logger.moderation(`추방: ${targetUser.tag} by ${interaction.user.tag} - ${reason}`);
  },
};
