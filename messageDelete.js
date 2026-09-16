// events/messageDelete.js
// 메시지가 삭제되면 로그 채널에 기록합니다.
// 민감한 정보(토큰, 비밀번호 등)가 우연히 로그에 남지 않도록 내용 길이를 제한합니다.

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');

const MAX_CONTENT_LENGTH = 1000;

module.exports = {
  name: 'messageDelete',
  once: false,
  async execute(message) {
    try {
      if (!message.guild || message.author?.bot) return;

      const settings = getGuildSettings(message.guild.id);
      if (!settings.logChannelId) return;

      const logChannel = await message.guild.channels.fetch(settings.logChannelId).catch(() => null);
      if (!logChannel || !logChannel.isTextBased()) return;

      const content = message.content
        ? message.content.slice(0, MAX_CONTENT_LENGTH)
        : '(내용 없음 - 임베드 또는 첨부파일일 수 있음)';

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🗑️ 메시지 삭제됨')
        .addFields(
          { name: '작성자', value: message.author ? `${message.author.tag} (${message.author.id})` : '알 수 없음' },
          { name: '채널', value: `${message.channel}` },
          { name: '내용', value: content || '(빈 메시지)' },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('메시지 삭제 로그 처리 중 오류', err);
    }
  },
};
