// events/guildMemberUpdate.js
// 닉네임 변경, 역할 변경을 로그 채널에 기록합니다.

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(oldMember, newMember) {
    try {
      const settings = getGuildSettings(newMember.guild.id);
      if (!settings.logChannelId) return;

      const logChannel = await newMember.guild.channels.fetch(settings.logChannelId).catch(() => null);
      if (!logChannel || !logChannel.isTextBased()) return;

      // 닉네임 변경
      if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📝 닉네임 변경')
          .addFields(
            { name: '사용자', value: `${newMember.user.tag} (${newMember.id})` },
            { name: '이전 닉네임', value: oldMember.nickname || '(없음)', inline: true },
            { name: '변경된 닉네임', value: newMember.nickname || '(없음)', inline: true },
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }

      // 역할 변경
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
      const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔧 역할 변경')
          .addFields({ name: '사용자', value: `${newMember.user.tag} (${newMember.id})` });

        if (addedRoles.size > 0) {
          embed.addFields({ name: '추가된 역할', value: addedRoles.map((r) => r.name).join(', ') });
        }
        if (removedRoles.size > 0) {
          embed.addFields({ name: '제거된 역할', value: removedRoles.map((r) => r.name).join(', ') });
        }
        embed.setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error('멤버 변경 로그 처리 중 오류', err);
    }
  },
};
