// commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('봇의 응답 속도를 확인합니다.'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '핑 측정 중...', fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    await interaction.editReply(`🏓 퐁! 응답 시간: **${roundTrip}ms** | WebSocket Ping: **${wsPing}ms**`);
  },
};
