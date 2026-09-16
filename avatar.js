// commands/avatar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('사용자의 아바타를 표시합니다.')
    .addUserOption((option) => option.setName('user').setDescription('아바타를 확인할 사용자').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${targetUser.tag}님의 아바타`)
      .setImage(targetUser.displayAvatarURL({ size: 1024 }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
