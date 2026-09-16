// utils/tickets.js
// 티켓 생성/닫기 핵심 로직입니다.
// - 티켓 생성: 지정된 티켓 카테고리 아래에 비공개 채널을 만들고, 작성자에게 DM으로 링크를 보내고,
//   티켓로그 채널에 기록합니다.
// - 티켓 닫기: 채널을 잠근 뒤 잠시 후 삭제하고, 티켓로그 채널에 기록합니다.
// - 관리자(봇 관리자/오너) 또는 ManageChannels 권한 보유자, 티켓 개설자 본인만 닫을 수 있습니다.

const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('./logger');
const { getGuildSettings, getOpenTicketChannelId, setOpenTicket, removeOpenTicketByChannel } = require('./database');
const { isAdmin } = require('./adminStore');

const TICKET_CLOSE_DELAY_MS = 5000;

function buildTicketCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_button').setLabel('🔒 티켓 닫기').setStyle(ButtonStyle.Danger),
  );
}

function buildTicketCreateRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create_button').setLabel('🎫 티켓 생성').setStyle(ButtonStyle.Primary),
  );
}

async function createTicket(interaction) {
  const { guild, user } = interaction;
  const settings = getGuildSettings(guild.id);

  if (!settings.ticketCategoryId) {
    await interaction.reply({
      content: '티켓 카테고리가 설정되어 있지 않습니다. 관리자에게 `/설정 티켓카테고리`로 먼저 설정해달라고 요청해주세요.',
      ephemeral: true,
    });
    return;
  }

  const category = await guild.channels.fetch(settings.ticketCategoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: '설정된 티켓 카테고리를 찾을 수 없습니다. 관리자에게 문의해주세요.',
      ephemeral: true,
    });
    return;
  }

  const existingChannelId = getOpenTicketChannelId(guild.id, user.id);
  if (existingChannelId) {
    const existingChannel = await guild.channels.fetch(existingChannelId).catch(() => null);
    if (existingChannel) {
      await interaction.reply({ content: `이미 열려있는 티켓이 있습니다: ${existingChannel}`, ephemeral: true });
      return;
    }
    // 채널이 실제로는 삭제되어 있으면 기록만 정리하고 계속 진행
    removeOpenTicketByChannel(guild.id, existingChannelId);
  }

  await interaction.deferReply({ ephemeral: true });

  const channelName = `티켓-${user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-');

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket-owner:${user.id}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: interaction.client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
      },
    ],
  });

  setOpenTicket(guild.id, user.id, ticketChannel.id);

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 티켓이 생성되었습니다')
    .setDescription(`${user}님, 문의 내용을 자유롭게 남겨주세요. 담당자가 확인 후 답변드립니다.`)
    .setTimestamp();

  await ticketChannel.send({ embeds: [welcomeEmbed], components: [buildTicketCloseRow()] });

  // 티켓 개설자에게 DM으로 링크 전송 (DM이 막혀 있으면 실패할 수 있으므로 별도 처리)
  try {
    await user.send(`🎫 티켓이 생성되었습니다: ${ticketChannel.url}`);
  } catch (err) {
    logger.warn(`티켓 생성 DM 전송 실패 (DM 차단 가능): ${user.tag}`);
  }

  // 티켓로그 채널에 기록
  if (settings.ticketLogChannelId) {
    const logChannel = await guild.channels.fetch(settings.ticketLogChannelId).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🎫 티켓 생성됨')
        .addFields(
          { name: '개설자', value: `${user.tag} (${user.id})` },
          { name: '채널', value: `${ticketChannel}` },
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch((err) => logger.error('티켓로그 전송 실패', err));
    }
  }

  await interaction.editReply({ content: `✅ 티켓이 생성되었습니다: ${ticketChannel}` });
  logger.log(`티켓 생성: ${user.tag} -> #${ticketChannel.id}`);
}

async function closeTicket(interaction) {
  const { guild, channel, user } = interaction;
  const settings = getGuildSettings(guild.id);

  const isTicketOwner = channel.topic === `ticket-owner:${user.id}`;
  const member = await guild.members.fetch(user.id).catch(() => null);
  const hasManageChannels = member?.permissions?.has(PermissionFlagsBits.ManageChannels);
  const isBotAdmin = isAdmin(user.id);

  if (!isTicketOwner && !hasManageChannels && !isBotAdmin) {
    await interaction.reply({ content: '이 티켓을 닫을 권한이 없습니다.', ephemeral: true });
    return;
  }

  if (!channel.topic || !channel.topic.startsWith('ticket-owner:')) {
    await interaction.reply({ content: '이 채널은 티켓 채널이 아닙니다.', ephemeral: true });
    return;
  }

  await interaction.reply(`🔒 이 티켓은 ${TICKET_CLOSE_DELAY_MS / 1000}초 후 자동으로 삭제됩니다. (닫은 사람: ${user.tag})`);

  const ticketOwnerId = channel.topic.replace('ticket-owner:', '');

  if (settings.ticketLogChannelId) {
    const logChannel = await guild.channels.fetch(settings.ticketLogChannelId).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🔒 티켓 닫힘')
        .addFields(
          { name: '티켓 개설자 ID', value: ticketOwnerId },
          { name: '닫은 사람', value: `${user.tag} (${user.id})` },
          { name: '채널명', value: channel.name },
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch((err) => logger.error('티켓로그 전송 실패', err));
    }
  }

  removeOpenTicketByChannel(guild.id, channel.id);
  logger.moderation(`티켓 닫힘: ${channel.name} by ${user.tag}`);

  setTimeout(() => {
    channel.delete('티켓 닫힘').catch((err) => logger.error('티켓 채널 삭제 실패', err));
  }, TICKET_CLOSE_DELAY_MS);
}

module.exports = {
  buildTicketCreateRow,
  buildTicketCloseRow,
  createTicket,
  closeTicket,
};
