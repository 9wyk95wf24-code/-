// commands-prefix/관리자.js
// "!관리자" - 현재 등록된 관리자 목록을 보여줍니다. (봇 전역 목록, 서버 구분 없음)

const { EmbedBuilder } = require('discord.js');
const { listAdmins } = require('../utils/adminStore');

module.exports = {
  name: '관리자',
  description: '관리자 목록을 표시합니다.',

  async execute(message) {
    const admins = listAdmins();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🛡️ 관리자 목록')
      .setDescription(admins.length > 0 ? admins.map((id, i) => `${i + 1}. <@${id}> (${id})`).join('\n') : '등록된 관리자가 없습니다.')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
