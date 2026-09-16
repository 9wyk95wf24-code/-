// commands-prefix/음성랭킹.js
// "!음성랭킹" - 서버 음성 활동 랭킹 1위~15위. 정확한 누적 시간과 마지막 입장 시각(몇시 몇분)을 표시합니다.

const { EmbedBuilder } = require('discord.js');
const { getRanking } = require('../utils/activityTracker');
const { formatDuration, formatKoreanTime } = require('../utils/formatters');

module.exports = {
  name: '음성랭킹',
  description: '서버 음성 활동 랭킹 1~15위를 표시합니다.',

  async execute(message) {
    const ranking = getRanking(message.guild.id, 'voice', 15);

    if (ranking.length === 0) {
      await message.reply('아직 집계된 음성 활동 기록이 없습니다.');
      return;
    }

    const lines = ranking.map((entry, i) => {
      return `**${i + 1}위** <@${entry.userId}> (${entry.userId})\n> 누적: ${formatDuration(entry.voiceMs)} · 마지막 입장: ${formatKoreanTime(entry.lastVoiceJoinAt)}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎙️ 음성 활동 랭킹 TOP 15')
      .setDescription(lines.join('\n\n').slice(0, 4000))
      .setFooter({ text: '매일 자정(KST)에 자동으로 초기화됩니다.' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
