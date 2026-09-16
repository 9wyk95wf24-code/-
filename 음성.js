// commands-prefix/음성.js
// "!음성" - 자신의 현재 서버 음성 활동 시간과 유저 ID를 알려줍니다.

const { EmbedBuilder } = require('discord.js');
const { getCurrentActivityDetailed } = require('../utils/activityTracker');
const { formatDuration, formatKoreanTime } = require('../utils/formatters');

module.exports = {
  name: '음성',
  description: '자신의 음성채널 활동 시간을 확인합니다.',

  async execute(message) {
    const activity = getCurrentActivityDetailed(message.guild.id, message.author.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎙️ 내 음성 활동')
      .addFields(
        { name: '유저 ID', value: message.author.id, inline: true },
        { name: '누적 음성 시간', value: formatDuration(activity.voiceMs), inline: true },
        { name: '마지막 입장', value: formatKoreanTime(activity.lastVoiceJoinAt) },
      )
      .setFooter({ text: '매일 자정(KST)에 자동으로 초기화됩니다.' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
