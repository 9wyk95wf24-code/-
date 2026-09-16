// utils/linkFilter.js
// 허용되지 않은 링크가 포함된 메시지를 감지/삭제합니다.

const URL_REGEX = /https?:\/\/[^\s]+/gi;

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * 메시지에 허용되지 않은 링크가 있으면 true를 반환합니다.
 */
function containsDisallowedLink(content, allowedDomains = []) {
  const matches = content.match(URL_REGEX);
  if (!matches) return false;

  return matches.some((url) => {
    const domain = extractDomain(url);
    if (!domain) return true; // 파싱 실패 시 안전하게 차단 대상으로 취급
    return !allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
  });
}

module.exports = {
  containsDisallowedLink,
};
