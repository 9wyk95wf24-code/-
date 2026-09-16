// utils/wordFilter.js
// 서버별로 등록된 금칙어가 메시지에 포함되어 있는지 확인합니다.

function containsBadWord(content, badWords = []) {
  if (!badWords || badWords.length === 0) return false;
  const normalized = content.toLowerCase();
  return badWords.some((word) => normalized.includes(word.toLowerCase()));
}

module.exports = {
  containsBadWord,
};
