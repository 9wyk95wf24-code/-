// commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('사용 가능한 모든 명령어를 표시합니다.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 도움말')
      .setDescription('사용 가능한 명령어 목록입니다.')
      .addFields(
        {
          name: '🔧 일반',
          value: '`/ping` `/botinfo` `/serverinfo` `/userinfo` `/avatar` `/servericon` `/invite` `/help` `/stats`',
        },
        {
          name: '📊 활동',
          value:
            '`/활동확인` `/활동초기화` `!음성` `!음성랭킹` `!채팅` `!채팅랭킹` `!활동초기화`\n매일 자정(KST)에 자동 초기화됩니다.',
        },
        {
          name: '🎫 티켓',
          value: '`!티켓버튼` (패널 게시) · 티켓 채널의 🔒 버튼으로 닫기',
        },
        {
          name: '🛡️ 관리 (Discord 서버 권한 필요)',
          value:
            '`/kick` `/ban` `/unban` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/announce` `/이벤트` `/설정`',
        },
        {
          name: '👑 오너/관리자 시스템 (봇 전역)',
          value: '`!오너` `!관리자` `!관리자등록` `!관리자제거` `!라이센스생성` (오너 전용) `!관리자패널` (관리자/오너 전용)',
        },
      )
      .setFooter({ text: '괄호 안의 옵션은 명령어 입력 시 자동완성으로 확인할 수 있습니다.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
