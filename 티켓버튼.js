// commands-prefix/티켓버튼.js
// "!티켓버튼" - 현재 채널 상단에 티켓 생성 버튼 패널을 게시합니다. (ManageGuild 권한 필요)

const { EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits } = require('../utils/permissions');
const { buildTicketCreateRow } = require('../utils/tickets');
const { getGuildSettings } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: '티켓버튼',
  permissions: [PermissionFlagsBits.ManageGuild],
  description: '티켓 생성 버튼 패널을 게시합니다.',

  async execute(message) {
    const settings = getGuildSettings(message.guild.id);

    if (!settings.ticketCategoryId) {
      await message.reply(
        '⚠️ 티켓 카테고리가 아직 설정되어 있지 않습니다. `/설정 티켓카테고리`로 먼저 설정한 뒤 다시 시도해주세요. (버튼은 게시하되, 설정 전까지는 티켓 생성이 되지 않습니다.)',
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 문의 티켓')
      .setDescription('아래 버튼을 눌러 개인 문의 채널을 생성하세요.')
      .setTimestamp();

    await message.channel.send({ embeds: [embed], components: [buildTicketCreateRow()] });
    await message.delete().catch(() => null);
    logger.command(`티켓버튼 패널 게시: ${message.author.tag} - #${message.channel.id}`);
  },
};
