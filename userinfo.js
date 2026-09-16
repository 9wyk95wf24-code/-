// commands/userinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('사용자의 정보를 표시합니다.')
    .addUserOption((option) => option.setName('user').setDescription('정보를 확인할 사용자').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`👤 ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '사용자 ID', value: targetUser.id, inline: true },
        { name: '계정 생성일', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>`, inline: true },
      );

    if (member) {
      embed.addFields(
        { name: '서버 가입일', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
        {
          name: '역할',
          value:
            member.roles.cache
              .filter((r) => r.id !== interaction.guild.id)
              .map((r) => r.toString())
              .join(', ') || '없음',
        },
      );
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
