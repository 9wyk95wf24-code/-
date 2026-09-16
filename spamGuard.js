// utils/spamGuard.js
// 짧은 시간에 반복적으로 메시지를 보내는 사용자를 감지합니다.

const logger = require('./logger');
const { getGuildSettings } = require('./database');

// key: `${guildId}-${userId}` -> timestamp 배열
const messageHistory = new Map();
// 스팸으로 처리되어 잠시 재알림을 막기 위한 쿨다운
const recentlyFlagged = new Set();

function recordAndCheckSpam(message) {
  if (!message.guild || message.author.bot) return false;

  const settings = getGuildSettings(message.guild.id);
  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  const history = messageHistory.get(key) || [];
  const recentHistory = history.filter((t) => now - t <= settings.spamWindow);
  recentHistory.push(now);
  messageHistory.set(key, recentHistory);

  if (recentHistory.length >= settings.spamLimit) {
    if (recentlyFlagged.has(key)) {
      return false; // 이미 방금 처리함, 중복 조치 방지
    }
    recentlyFlagged.add(key);
    setTimeout(() => recentlyFlagged.delete(key), settings.spamWindow);
    messageHistory.set(key, []); // 조치 후 기록 초기화
    return true;
  }

  return false;
}

async function handleSpam(message) {
  const settings = getGuildSettings(message.guild.id);

  try {
    await message.channel.send({
      content: `${message.author}, 메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.`,
    });

    if (settings.timeoutDuration > 0 && message.member?.moderatable) {
      await message.member.timeout(settings.timeoutDuration, '자동 스팸 감지');
      logger.moderation(`스팸 감지로 타임아웃: ${message.author.tag} (${settings.timeoutDuration}ms)`);
    } else {
      logger.moderation(`스팸 감지 (타임아웃 미적용): ${message.author.tag}`);
    }
  } catch (err) {
    logger.error('스팸 조치 중 오류', err);
  }
}

module.exports = {
  recordAndCheckSpam,
  handleSpam,
};
