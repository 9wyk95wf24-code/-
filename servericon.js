// commands/servericon.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('servericon').setDescription('서버 아이콘을 크게 표시합니다.'),

  async execute(interaction) {
    const { guild } = interaction;
    const iconUrl = guild.iconURL({ size: 1024 });

    if (!iconUrl) {
      await interaction.reply({ content: '이 서버는 아이콘이 설정되어 있지 않습니다.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${guild.name}의 서버 아이콘`)
      .setImage(iconUrl)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
