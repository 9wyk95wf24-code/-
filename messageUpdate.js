// events/messageUpdate.js
// 메시지가 수정되면 이전/현재 내용을 로그 채널에 기록합니다.

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');

const MAX_CONTENT_LENGTH = 1000;

module.exports = {
  name: 'messageUpdate',
  once: false,
  async execute(oldMessage, newMessage) {
    try {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return; // 내용 변경이 없으면 무시 (임베드 로딩 등)

      const settings = getGuildSettings(newMessage.guild.id);
      if (!settings.logChannelId) return;

      const logChannel = await newMessage.guild.channels.fetch(settings.logChannelId).catch(() => null);
      if (!logChannel || !logChannel.isTextBased()) return;

      const before = (oldMessage.content || '(내용 없음)').slice(0, MAX_CONTENT_LENGTH);
      const after = (newMessage.content || '(내용 없음)').slice(0, MAX_CONTENT_LENGTH);

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('✏️ 메시지 수정됨')
        .addFields(
          { name: '작성자', value: `${newMessage.author.tag} (${newMessage.author.id})` },
          { name: '채널', value: `${newMessage.channel}` },
          { name: '수정 전', value: before },
          { name: '수정 후', value: after },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('메시지 수정 로그 처리 중 오류', err);
    }
  },
};
