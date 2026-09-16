// commands/announce.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('지정한 채널에 공지를 전송합니다. (관리자 전용)')
    .addChannelOption((option) => option.setName('channel').setDescription('공지를 보낼 채널').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('공지 제목').setRequired(true))
    .addStringOption((option) => option.setName('content').setDescription('공지 내용').setRequired(true)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.ManageGuild])) return;

    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');

    if (!channel.isTextBased()) {
      await interaction.reply({ content: '텍스트 채널을 선택해주세요.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📢 ${title}`)
      .setDescription(content)
      .setFooter({ text: `작성자: ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `${channel}에 공지를 전송했습니다.`, ephemeral: true });
    logger.command(`공지 전송: ${interaction.user.tag} -> #${channel.id}`);
  },
};
