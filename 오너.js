// commands-prefix/오너.js
// "!오너" - 관리자보다 높은 오너 목록을 보여줍니다.

const { EmbedBuilder } = require('discord.js');
const { listOwners } = require('../utils/adminStore');

module.exports = {
  name: '오너',
  description: '오너 목록을 표시합니다.',

  async execute(message) {
    const owners = listOwners();

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('👑 오너 목록')
      .setDescription(owners.length > 0 ? owners.map((id, i) => `${i + 1}. <@${id}> (${id})`).join('\n') : '등록된 오너가 없습니다.')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
