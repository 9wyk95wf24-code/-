// commands/invite.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('invite').setDescription('봇 초대 링크를 표시합니다.'),

  async execute(interaction) {
    const clientId = interaction.client.user.id;
    // 봇 운영에 필요한 기본 권한 (관리, 메시지 관리, 멤버 제재, 역할 관리 등)을 포함한 초대 링크
    const permissions = new PermissionsBitField([
      'ViewChannel',
      'SendMessages',
      'ManageMessages',
      'ManageWebhooks',
      'ManageRoles',
      'ManageChannels',
      'KickMembers',
      'BanMembers',
      'ModerateMembers',
      'ReadMessageHistory',
      'EmbedLinks',
      'AttachFiles',
      'UseExternalEmojis',
      'UseExternalStickers',
    ]);

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions.bitfield}&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🔗 봇 초대 링크')
      .setDescription(`[여기를 클릭해서 봇을 초대하세요](${inviteUrl})`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
