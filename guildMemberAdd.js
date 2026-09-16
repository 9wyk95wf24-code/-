// events/guildMemberAdd.js
// 새 멤버 입장 시: 환영 메시지 전송, 자동 역할 지급, 입장 로그 기록

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getGuildSettings } = require('../utils/database');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);

    // 1) 환영 메시지
    try {
      if (settings.welcomeChannelId) {
        const welcomeChannel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
        if (welcomeChannel && welcomeChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('👋 환영합니다!')
            .setDescription(`${member}님, **${member.guild.name}**에 오신 것을 환영합니다!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          await welcomeChannel.send({ embeds: [embed] });
        }
      }
    } catch (err) {
      logger.error('환영 메시지 전송 실패', err);
    }

    // 2) 자동 역할 지급
    try {
      if (settings.autoRoleId) {
        const role = await member.guild.roles.fetch(settings.autoRoleId).catch(() => null);
        if (role) {
          await member.roles.add(role, '자동 역할 지급');
          logger.log(`자동 역할 지급: ${member.user.tag} -> ${role.name}`);
        } else {
          logger.warn(`AUTO_ROLE_ID(${settings.autoRoleId})에 해당하는 역할을 찾을 수 없습니다.`);
        }
      }
    } catch (err) {
      logger.error('자동 역할 지급 실패', err);
    }

    // 3) 입장 로그
    try {
      if (settings.logChannelId) {
        const logChannel = await member.guild.channels.fetch(settings.logChannelId).catch(() => null);
        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('📥 멤버 입장')
            .addFields(
              { name: '사용자', value: `${member.user.tag} (${member.id})` },
              { name: '계정 생성일', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (err) {
      logger.error('입장 로그 기록 실패', err);
    }
  },
};
