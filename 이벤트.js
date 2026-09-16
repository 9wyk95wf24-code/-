// commands-prefix/이벤트.js
// "!이벤트 #채널 제목/내용" - 메시지에 사진을 첨부하면 함께 이벤트 공지로 전송합니다.
// 사용 예: #공지-채널 채널에서 "!이벤트 #이벤트채널 여름 이벤트/7월 한달간 진행됩니다!" + 이미지 첨부

const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits, hasPermission, NO_PERMISSION_MESSAGE } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  name: '이벤트',
  permissions: [PermissionFlagsBits.ManageGuild],
  description: '메시지와 사진을 포함한 이벤트 공지를 보냅니다.',

  async execute(message, args) {
    if (!hasPermission(message.member, [PermissionFlagsBits.ManageGuild])) {
      await message.reply(NO_PERMISSION_MESSAGE);
      return;
    }

    const targetChannel = message.mentions.channels.first();
    if (!targetChannel || !targetChannel.isTextBased()) {
      await message.reply('사용법: `!이벤트 #채널 제목/내용` (사진을 첨부하면 함께 게시됩니다)');
      return;
    }

    // 첫 번째 인자(채널 멘션)를 제외한 나머지를 "제목/내용"으로 파싱
    const rest = args.slice(1).join(' ');
    const [title, ...contentParts] = rest.split('/');
    const content = contentParts.join('/').trim();

    if (!title || !content) {
      await message.reply('사용법: `!이벤트 #채널 제목/내용` (제목과 내용은 `/`로 구분해주세요)');
      return;
    }

    const imageAttachment = message.attachments.find((att) => att.contentType?.startsWith('image/'));

    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle(`🎉 ${title.trim()}`)
      .setDescription(content)
      .setFooter({ text: `주최: ${message.author.tag}` })
      .setTimestamp();

    if (imageAttachment) {
      embed.setImage(imageAttachment.url);
    }

    await targetChannel.send({ embeds: [embed] });
    await message.reply(`✅ ${targetChannel}에 이벤트 공지를 전송했습니다.`);
    logger.command(`이벤트 공지 전송(접두사): ${message.author.tag} -> #${targetChannel.id}`);
  },
};
