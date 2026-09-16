// commands/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('현재 서버의 정보를 표시합니다.'),

  async execute(interaction) {
    const { guild } = interaction;
    if (!guild) {
      await interaction.reply({ content: '이 명령어는 서버 안에서만 사용할 수 있습니다.', ephemeral: true });
      return;
    }

    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL() || null)
      .addFields(
        { name: '서버 ID', value: guild.id, inline: true },
        { name: '서버 소유자', value: owner ? `${owner.user.tag}` : '알 수 없음', inline: true },
        { name: '생성일', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '멤버 수', value: `${guild.memberCount}명`, inline: true },
        { name: '채널 수', value: `${guild.channels.cache.size}개`, inline: true },
        { name: '역할 수', value: `${guild.roles.cache.size}개`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
