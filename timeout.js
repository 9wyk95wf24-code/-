// commands/timeout.js
const { SlashCommandBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

const MAX_TIMEOUT_MINUTES = 40320; // Discord 제한: 최대 28일

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('사용자에게 타임아웃을 적용합니다.')
    .addUserOption((option) => option.setName('user').setDescription('타임아웃할 사용자').setRequired(true))
    .addIntegerOption((option) =>
      option.setName('minutes').setDescription('타임아웃 시간(분)').setRequired(true).setMinValue(1).setMaxValue(MAX_TIMEOUT_MINUTES),
    )
    .addStringOption((option) => option.setName('reason').setDescription('사유').setRequired(false)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.ModerateMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || '사유 없음';

    // 잘못된 시간 입력 방지 (SlashCommandBuilder의 min/max로 1차 검증, 여기서 2차 검증)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIMEOUT_MINUTES) {
      await interaction.reply({ content: '타임아웃 시간은 1분 이상, 28일(40320분) 이하로 입력해주세요.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '해당 사용자를 서버에서 찾을 수 없습니다.', ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ content: '이 사용자는 권한 문제로 타임아웃을 적용할 수 없습니다.', ephemeral: true });
      return;
    }

    await member.timeout(minutes * 60 * 1000, reason);
    await interaction.reply(`✅ **${targetUser.tag}**님에게 ${minutes}분 타임아웃을 적용했습니다. 사유: ${reason}`);
    logger.moderation(`타임아웃: ${targetUser.tag} (${minutes}분) by ${interaction.user.tag} - ${reason}`);
  },
};
