// utils/formatters.js
// 활동 시간(ms)과 한국시간(KST) 표시를 위한 포맷터입니다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * ms를 "X시간 Y분 Z초" 형태로 변환합니다.
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.max(ms, 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}분`);
  parts.push(`${seconds}초`);

  return parts.join(' ');
}

/**
 * timestamp(ms)를 한국시간(KST) 기준 "오후 3시 42분" 형태로 변환합니다.
 */
function formatKoreanTime(timestamp) {
  if (!timestamp) return '기록 없음';

  const kstDate = new Date(timestamp + KST_OFFSET_MS);
  let hours = kstDate.getUTCHours();
  const minutes = kstDate.getUTCMinutes();
  const period = hours < 12 ? '오전' : '오후';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${period} ${hours}시 ${String(minutes).padStart(2, '0')}분`;
}

/**
 * timestamp(ms)를 한국시간(KST) 기준 "2026-09-16 오후 3시 42분" 형태로 변환합니다.
 */
function formatKoreanDateTime(timestamp) {
  if (!timestamp) return '기록 없음';

  const kstDate = new Date(timestamp + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day} ${formatKoreanTime(timestamp)}`;
}

module.exports = {
  formatDuration,
  formatKoreanTime,
  formatKoreanDateTime,
};
