// commands/botinfo.js
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('봇의 정보를 표시합니다.'),

  async execute(interaction) {
    const { client } = interaction;

    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🤖 ${client.user.username} 정보`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '서버 수', value: `${client.guilds.cache.size}개`, inline: true },
        { name: '사용자 수', value: `${totalMembers}명`, inline: true },
        { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
        { name: 'discord.js 버전', value: djsVersion, inline: true },
        { name: 'Node.js 버전', value: process.version, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
