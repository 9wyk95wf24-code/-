// utils/activityTracker.js
// 사용자별 메시지 전송 횟수와 음성채널 접속 시간("활동")을 추적합니다.
// 음성채널은 접속 중인 세션을 메모리에 들고 있다가, 퇴장/채널 이동 시점에 누적치를 저장합니다.

const logger = require('./logger');
const {
  incrementMessageCount,
  addVoiceMs,
  setVoiceJoinTimestamp,
  resetGuildActivity,
  getUserActivity,
  getGuildActivityList,
} = require('./database');

// key: `${guildId}-${userId}` -> 세션 시작 시각(ms)
const activeVoiceSessions = new Map();

function sessionKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

function trackMessage(guildId, userId) {
  try {
    incrementMessageCount(guildId, userId);
  } catch (err) {
    logger.error('메시지 활동 기록 실패', err);
  }
}

/**
 * voiceStateUpdate 이벤트를 받아 세션 시작/종료를 처리합니다.
 */
function handleVoiceStateUpdate(oldState, newState) {
  try {
    const user = newState.member?.user || oldState.member?.user;
    if (!user || user.bot) return;

    const guildId = newState.guild.id;
    const userId = user.id;
    const key = sessionKey(guildId, userId);

    const wasInChannel = Boolean(oldState.channelId);
    const isInChannel = Boolean(newState.channelId);

    if (!wasInChannel && isInChannel) {
      // 새로 음성채널 입장 -> 세션 시작 및 입장 시각 기록 (랭킹 표시용)
      const now = Date.now();
      activeVoiceSessions.set(key, now);
      setVoiceJoinTimestamp(guildId, userId, now);
      return;
    }

    if (wasInChannel && !isInChannel) {
      // 음성채널 완전 퇴장 -> 세션 종료 및 누적
      flushSession(guildId, userId, key);
      return;
    }

    if (wasInChannel && isInChannel && oldState.channelId !== newState.channelId) {
      // 채널 이동 -> 기존 세션 종료 후 새 세션 시작 (입장 시각도 갱신)
      flushSession(guildId, userId, key);
      const now = Date.now();
      activeVoiceSessions.set(key, now);
      setVoiceJoinTimestamp(guildId, userId, now);
    }
  } catch (err) {
    logger.error('음성 활동 추적 처리 중 오류', err);
  }
}

function flushSession(guildId, userId, key) {
  const startedAt = activeVoiceSessions.get(key);
  if (!startedAt) return;

  const elapsedMs = Date.now() - startedAt;
  activeVoiceSessions.delete(key);
  addVoiceMs(guildId, userId, elapsedMs);
}

/**
 * 현재까지의 활동(메시지 수 + 음성 시간(분))을 반환합니다.
 * 진행 중인 음성 세션이 있으면 현재까지의 경과 시간도 합산해서 보여줍니다.
 */
function getCurrentActivity(guildId, userId) {
  const stored = getUserActivity(guildId, userId);
  const key = sessionKey(guildId, userId);
  const activeSince = activeVoiceSessions.get(key);
  const inProgressMs = activeSince ? Date.now() - activeSince : 0;

  return {
    messages: stored.messages,
    voiceMinutes: Math.floor((stored.voiceMs + inProgressMs) / 60000),
  };
}

/**
 * !음성 / !채팅처럼 상세 표시가 필요한 곳에서 쓰는 원본 데이터(ms 단위, 타임스탬프 포함) 버전입니다.
 */
function getCurrentActivityDetailed(guildId, userId) {
  const stored = getUserActivity(guildId, userId);
  const key = sessionKey(guildId, userId);
  const activeSince = activeVoiceSessions.get(key);
  const inProgressMs = activeSince ? Date.now() - activeSince : 0;

  return {
    messages: stored.messages,
    voiceMs: stored.voiceMs + inProgressMs,
    lastMessageAt: stored.lastMessageAt,
    lastVoiceJoinAt: stored.lastVoiceJoinAt,
  };
}

/**
 * 서버 전체 사용자의 활동을 "현재 진행 중인 세션 포함"해서 계산한 뒤 반환합니다.
 * type: 'voice' | 'messages' 기준으로 내림차순 정렬해서 상위 limit명만 반환합니다.
 */
function getRanking(guildId, type, limit = 15) {
  const list = getGuildActivityList(guildId);
  const now = Date.now();

  const enriched = list.map(([userId, entry]) => {
    const key = sessionKey(guildId, userId);
    const activeSince = activeVoiceSessions.get(key);
    const inProgressMs = activeSince ? now - activeSince : 0;

    return {
      userId,
      messages: entry.messages,
      voiceMs: entry.voiceMs + inProgressMs,
      lastMessageAt: entry.lastMessageAt,
      lastVoiceJoinAt: entry.lastVoiceJoinAt,
    };
  });

  const sorted =
    type === 'voice'
      ? enriched.filter((e) => e.voiceMs > 0).sort((a, b) => b.voiceMs - a.voiceMs)
      : enriched.filter((e) => e.messages > 0).sort((a, b) => b.messages - a.messages);

  return sorted.slice(0, limit);
}

/**
 * 해당 서버의 활동 기록을 초기화합니다.
 * 저장된 누적치를 0으로 만들고, 현재 음성채널에 접속 중인 세션의 시작 시각도
 * 지금 시점으로 리셋해서 "현재 활동"까지 함께 초기화합니다.
 */
function resetActivity(guildId) {
  resetGuildActivity(guildId);

  const now = Date.now();
  for (const key of activeVoiceSessions.keys()) {
    if (key.startsWith(`${guildId}-`)) {
      activeVoiceSessions.set(key, now);
    }
  }

  logger.log(`활동 초기화 완료 (서버: ${guildId})`);
}

module.exports = {
  trackMessage,
  handleVoiceStateUpdate,
  getCurrentActivity,
  getCurrentActivityDetailed,
  getRanking,
  resetActivity,
};
