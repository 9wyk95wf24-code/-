// commands/event.js
// "/이벤트" - 지정한 채널에 제목/내용과 함께 사진(첨부파일)을 포함한 이벤트 공지를 보냅니다.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('이벤트')
    .setDescription('메시지와 사진을 포함한 이벤트 공지를 보냅니다. (관리자 전용)')
    .addChannelOption((o) => o.setName('채널').setDescription('공지를 보낼 채널').setRequired(true))
    .addStringOption((o) => o.setName('제목').setDescription('이벤트 제목').setRequired(true))
    .addStringOption((o) => o.setName('내용').setDescription('이벤트 내용').setRequired(true))
    .addAttachmentOption((o) => o.setName('사진').setDescription('이벤트에 첨부할 사진').setRequired(false))
    .addBooleanOption((o) => o.setName('전체멘션').setDescription('@everyone으로 알릴지 여부').setRequired(false)),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.ManageGuild])) return;

    const channel = interaction.options.getChannel('채널');
    const title = interaction.options.getString('제목');
    const content = interaction.options.getString('내용');
    const photo = interaction.options.getAttachment('사진');
    const mentionEveryone = interaction.options.getBoolean('전체멘션') || false;

    if (!channel.isTextBased()) {
      await interaction.reply({ content: '텍스트 채널을 선택해주세요.', ephemeral: true });
      return;
    }

    if (photo && !photo.contentType?.startsWith('image/')) {
      await interaction.reply({ content: '이미지 파일만 첨부할 수 있습니다.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle(`🎉 ${title}`)
      .setDescription(content)
      .setFooter({ text: `주최: ${interaction.user.tag}` })
      .setTimestamp();

    if (photo) {
      embed.setImage(photo.url);
    }

    await channel.send({
      content: mentionEveryone ? '@everyone' : undefined,
      embeds: [embed],
      allowedMentions: mentionEveryone ? { parse: ['everyone'] } : { parse: [] },
    });

    await interaction.reply({ content: `✅ ${channel}에 이벤트 공지를 전송했습니다.`, ephemeral: true });
    logger.command(`이벤트 공지 전송: ${interaction.user.tag} -> #${channel.id}`);
  },
};
