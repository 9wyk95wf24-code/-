// commands/stats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('서버 통계를 표시합니다.'),

  async execute(interaction) {
    const { guild } = interaction;

    // 멤버 캐시가 비어있을 수 있으므로 필요 시 가져옵니다.
    await guild.members.fetch().catch(() => null);

    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const onlineMembers = guild.members.cache.filter(
      (m) => m.presence && m.presence.status !== 'offline',
    ).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📈 ${guild.name} 통계`)
      .addFields(
        { name: '전체 멤버', value: `${totalMembers}명`, inline: true },
        { name: '온라인 멤버', value: `${onlineMembers}명 (Presence Intent 필요)`, inline: true },
        { name: '봇 수', value: `${botCount}개`, inline: true },
        { name: '채널 수', value: `${guild.channels.cache.size}개`, inline: true },
        { name: '역할 수', value: `${guild.roles.cache.size}개`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
