// commands-prefix/관리자패널.js
// "!관리자패널" - 관리자/오너 전용. 사용 가능한 기능을 안내하고, 활동 초기화를 버튼으로 바로 실행할 수 있게 합니다.
// 관리자는 경고 부여/삭제, 티켓 닫기, 이 패널, 활동 초기화만 사용할 수 있습니다 (그 외 명령어는 Discord 서버 권한 필요).

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin, isOwner } = require('../utils/adminStore');

module.exports = {
  name: '관리자패널',
  description: '관리자 전용 패널을 표시합니다.',

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      await message.reply('이 명령어는 관리자 또는 오너만 사용할 수 있습니다.');
      return;
    }

    const rank = isOwner(message.author.id) ? '오너' : '관리자';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🛠️ 관리자 패널 (${rank})`)
      .setDescription(
        [
          '사용 가능한 기능:',
          '• `/warn` `!warn` 대신 - 경고 부여',
          '• `/clearwarnings` - 경고 초기화',
          '• 티켓 채널의 🔒 티켓 닫기 버튼',
          '• 아래 버튼으로 활동(메시지/음성) 즉시 초기화',
        ].join('\n'),
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_panel_reset_activity').setLabel('🔄 활동 초기화').setStyle(ButtonStyle.Danger),
    );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
