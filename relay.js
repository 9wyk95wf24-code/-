// utils/relay.js
// 설정된 채널 간에 메시지를 릴레이합니다.
// 대상 채널에 "RelayBot" 이름의 Webhook을 만들어(또는 재사용해)
// 원본 작성자의 이름/아바타를 그대로 유지한 채 메시지를 전달합니다.

const logger = require('./logger');
const { getGuildSettings } = require('./database');

const WEBHOOK_NAME = 'RelayBot';
const webhookCache = new Map(); // channelId -> Webhook

async function getOrCreateWebhook(channel) {
  if (webhookCache.has(channel.id)) {
    return webhookCache.get(channel.id);
  }

  try {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name === WEBHOOK_NAME);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: WEBHOOK_NAME,
        reason: '메시지 릴레이 기능을 위한 자동 생성 Webhook',
      });
    }

    webhookCache.set(channel.id, webhook);
    return webhook;
  } catch (err) {
    logger.error(`Webhook 생성/조회 실패 (채널 ${channel.id})`, err);
    return null;
  }
}

/**
 * 메시지가 릴레이 대상인지 확인하고, 대상이면 릴레이합니다.
 * .env의 기본 릴레이 쌍과, 서버별 설정(guildSettings.relayPairs)을 모두 확인합니다.
 */
async function relayMessage(message) {
  if (!message.guild || message.author.bot) return;

  const settings = getGuildSettings(message.guild.id);

  const pairs = [...settings.relayPairs];

  // .env 기본 릴레이 쌍도 함께 지원
  if (process.env.RELAY_SOURCE_CHANNEL_ID && process.env.RELAY_TARGET_CHANNEL_ID) {
    pairs.push({
      sourceChannelId: process.env.RELAY_SOURCE_CHANNEL_ID,
      targetChannelId: process.env.RELAY_TARGET_CHANNEL_ID,
    });
  }

  const matchedPairs = pairs.filter((p) => p.sourceChannelId === message.channel.id);
  if (matchedPairs.length === 0) return;

  for (const pair of matchedPairs) {
    try {
      const targetChannel = await message.client.channels.fetch(pair.targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) continue;

      const webhook = await getOrCreateWebhook(targetChannel);
      if (!webhook) continue;

      const files = message.attachments.map((att) => att.url);

      await webhook.send({
        content: message.content && message.content.length > 0 ? message.content : undefined,
        username: message.member?.displayName || message.author.username,
        avatarURL: message.author.displayAvatarURL(),
        files: files.length > 0 ? files : undefined,
        embeds: message.embeds.length > 0 ? message.embeds : undefined,
        allowedMentions: { parse: [] }, // 릴레이된 메시지가 실수로 멘션을 재알림하지 않도록 방지
      });

      logger.log(`릴레이 완료: #${message.channel.id} -> #${pair.targetChannelId}`);
    } catch (err) {
      logger.error(`릴레이 실패 (${message.channel.id} -> ${pair.targetChannelId})`, err);
    }
  }
}

module.exports = {
  relayMessage,
};
