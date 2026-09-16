// events/guildMemberRemove.js
// 멤버가 서버를 나가면 로그 채널에 기록합니다.

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member) {
    try {
      const settings = getGuildSettings(member.guild.id);
      const targetChannelId = settings.leaveChannelId || settings.logChannelId;
      if (!targetChannelId) return;

      const channel = await member.guild.channels.fetch(targetChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('📤 멤버 퇴장')
        .setDescription(`**${member.user.tag}**님이 서버를 나갔습니다.`)
        .addFields({ name: '사용자 ID', value: member.id })
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('퇴장 로그 처리 중 오류', err);
    }
  },
};
