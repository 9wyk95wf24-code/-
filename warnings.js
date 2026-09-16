// commands/warnings.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserWarnings } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('사용자의 경고 목록을 조회합니다.')
    .addUserOption((option) => option.setName('user').setDescription('조회할 사용자').setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const warnings = getUserWarnings(interaction.guild.id, targetUser.id);

    if (warnings.length === 0) {
      await interaction.reply({ content: `**${targetUser.tag}**님은 경고 기록이 없습니다.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`⚠️ ${targetUser.tag}님의 경고 목록 (총 ${warnings.length}회)`)
      .setDescription(
        warnings
          .map((w, i) => `**${i + 1}.** ${w.reason}\n> <@${w.moderatorId}> · <t:${Math.floor(w.timestamp / 1000)}:R>`)
          .join('\n\n')
          .slice(0, 4000),
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
