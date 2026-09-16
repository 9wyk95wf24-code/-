// utils/database.js
// 별도의 DB 서버 없이 동작하도록 JSON 파일 기반의 단순 저장소를 구현합니다.
// data/guildSettings.json  -> 서버별 설정 (로그 채널, 환영 채널, 자동 역할, 필터 옵션 등)
// data/warnings.json       -> 사용자 경고 기록

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'guildSettings.json');
const WARNINGS_PATH = path.join(DATA_DIR, 'warnings.json');
const ACTIVITY_PATH = path.join(DATA_DIR, 'activity.json');
const TICKETS_PATH = path.join(DATA_DIR, 'tickets.json');

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
}

function readJson(filePath, defaultValue) {
  try {
    ensureFile(filePath, defaultValue);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] ${filePath} 읽기 실패:`, err);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    ensureFile(filePath, {});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[ERROR] ${filePath} 저장 실패:`, err);
    return false;
  }
}

// ---------- 서버별 설정 ----------

function getDefaultGuildSettings() {
  return {
    logChannelId: process.env.LOG_CHANNEL_ID || null,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,
    leaveChannelId: process.env.LEAVE_CHANNEL_ID || null,
    autoRoleId: process.env.AUTO_ROLE_ID || null,
    relayPairs: [], // { sourceChannelId, targetChannelId }
    linkFilterEnabled: (process.env.LINK_FILTER_ENABLED || 'false') === 'true',
    linkFilterAllowedDomains: (process.env.LINK_FILTER_ALLOWED_DOMAINS || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean),
    badWordFilterEnabled: (process.env.BAD_WORD_FILTER_ENABLED || 'false') === 'true',
    badWords: [],
    spamLimit: Number(process.env.SPAM_LIMIT || 5),
    spamWindow: Number(process.env.SPAM_WINDOW || 10000),
    timeoutDuration: Number(process.env.TIMEOUT_DURATION || 300000),
    ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
    ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
  };
}

function getAllGuildSettings() {
  return readJson(SETTINGS_PATH, {});
}

function getGuildSettings(guildId) {
  const all = getAllGuildSettings();
  if (!all[guildId]) {
    all[guildId] = getDefaultGuildSettings();
    writeJson(SETTINGS_PATH, all);
  } else {
    // 이전 버전 데이터에 새 필드가 없을 경우를 대비해 기본값과 병합
    all[guildId] = { ...getDefaultGuildSettings(), ...all[guildId] };
  }
  return all[guildId];
}

function updateGuildSettings(guildId, partialSettings) {
  const all = getAllGuildSettings();
  const current = all[guildId] || getDefaultGuildSettings();
  all[guildId] = { ...current, ...partialSettings };
  writeJson(SETTINGS_PATH, all);
  return all[guildId];
}

// ---------- 경고 ----------

function getAllWarnings() {
  return readJson(WARNINGS_PATH, {});
}

function getUserWarnings(guildId, userId) {
  const all = getAllWarnings();
  const guildWarnings = all[guildId] || {};
  return guildWarnings[userId] || [];
}

function addWarning(guildId, userId, reason, moderatorId) {
  const all = getAllWarnings();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = [];

  const warning = {
    reason: reason || '사유 없음',
    moderatorId,
    timestamp: Date.now(),
  };
  all[guildId][userId].push(warning);
  writeJson(WARNINGS_PATH, all);
  return all[guildId][userId];
}

function clearWarnings(guildId, userId) {
  const all = getAllWarnings();
  if (all[guildId]) {
    all[guildId][userId] = [];
    writeJson(WARNINGS_PATH, all);
  }
  return [];
}

// ---------- 활동(메시지 수 / 음성채널 시간) ----------
// 구조: { [guildId]: { [userId]: { messages, voiceMs, lastMessageAt, lastVoiceJoinAt } } }

function getDefaultActivityEntry() {
  return { messages: 0, voiceMs: 0, lastMessageAt: null, lastVoiceJoinAt: null };
}

function getAllActivity() {
  return readJson(ACTIVITY_PATH, {});
}

function getGuildActivity(guildId) {
  const all = getAllActivity();
  return all[guildId] || {};
}

function getUserActivity(guildId, userId) {
  const guildActivity = getGuildActivity(guildId);
  return { ...getDefaultActivityEntry(), ...(guildActivity[userId] || {}) };
}

/**
 * 서버의 모든 사용자 활동을 [userId, entry] 배열로 반환합니다. (랭킹 명령어용)
 */
function getGuildActivityList(guildId) {
  const guildActivity = getGuildActivity(guildId);
  return Object.entries(guildActivity).map(([userId, entry]) => [
    userId,
    { ...getDefaultActivityEntry(), ...entry },
  ]);
}

function incrementMessageCount(guildId, userId) {
  const all = getAllActivity();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = getDefaultActivityEntry();

  all[guildId][userId].messages += 1;
  all[guildId][userId].lastMessageAt = Date.now();
  writeJson(ACTIVITY_PATH, all);
  return all[guildId][userId];
}

function addVoiceMs(guildId, userId, ms) {
  if (!ms || ms <= 0) return;

  const all = getAllActivity();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = getDefaultActivityEntry();

  all[guildId][userId].voiceMs += ms;
  writeJson(ACTIVITY_PATH, all);
  return all[guildId][userId];
}

function setVoiceJoinTimestamp(guildId, userId, timestamp) {
  const all = getAllActivity();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = getDefaultActivityEntry();

  all[guildId][userId].lastVoiceJoinAt = timestamp;
  writeJson(ACTIVITY_PATH, all);
  return all[guildId][userId];
}

function resetGuildActivity(guildId) {
  const all = getAllActivity();
  all[guildId] = {};
  writeJson(ACTIVITY_PATH, all);
}

// ---------- 티켓 ----------
// 구조: { [guildId]: { [userId]: channelId } } - 사용자당 열려있는 티켓 채널 하나만 추적

function getAllTickets() {
  return readJson(TICKETS_PATH, {});
}

function getOpenTicketChannelId(guildId, userId) {
  const all = getAllTickets();
  return all[guildId]?.[userId] || null;
}

function setOpenTicket(guildId, userId, channelId) {
  const all = getAllTickets();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][userId] = channelId;
  writeJson(TICKETS_PATH, all);
}

function removeOpenTicketByChannel(guildId, channelId) {
  const all = getAllTickets();
  if (!all[guildId]) return;
  const userId = Object.keys(all[guildId]).find((uid) => all[guildId][uid] === channelId);
  if (userId) {
    delete all[guildId][userId];
    writeJson(TICKETS_PATH, all);
  }
}

module.exports = {
  getGuildSettings,
  updateGuildSettings,
  getAllGuildSettings,
  getUserWarnings,
  addWarning,
  clearWarnings,
  getGuildActivity,
  getGuildActivityList,
  getUserActivity,
  incrementMessageCount,
  addVoiceMs,
  setVoiceJoinTimestamp,
  resetGuildActivity,
  getOpenTicketChannelId,
  setOpenTicket,
  removeOpenTicketByChannel,
};
