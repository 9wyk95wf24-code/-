// commands-prefix/채팅.js
// "!채팅" - 자신의 현재 서버 채팅 활동(메시지 수)과 유저 ID를 알려줍니다.
// 채팅은 음성과 달리 연속된 "시간"이 존재하지 않으므로, 메시지 수와 마지막 채팅 시각으로 표시합니다.

const { EmbedBuilder } = require('discord.js');
const { getCurrentActivityDetailed } = require('../utils/activityTracker');
const { formatKoreanTime } = require('../utils/formatters');

module.exports = {
  name: '채팅',
  description: '자신의 채팅 활동을 확인합니다.',

  async execute(message) {
    const activity = getCurrentActivityDetailed(message.guild.id, message.author.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('💬 내 채팅 활동')
      .addFields(
        { name: '유저 ID', value: message.author.id, inline: true },
        { name: '누적 메시지 수', value: `${activity.messages}개`, inline: true },
        { name: '마지막 채팅', value: formatKoreanTime(activity.lastMessageAt) },
      )
      .setFooter({ text: '매일 자정(KST)에 자동으로 초기화됩니다.' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
