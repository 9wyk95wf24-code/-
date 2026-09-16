// utils/activityScheduler.js
// 매일 자정(한국시간 KST, UTC+9 기준)에 모든 서버의 활동 기록을 자동으로 초기화합니다.
// ready 이벤트가 재연결 등으로 여러 번 발생해도 타이머가 중복 생성되지 않도록 방지합니다.

const logger = require('./logger');
const { resetActivity } = require('./activityTracker');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextMidnightKST() {
  const now = new Date();
  const nowKst = new Date(now.getTime() + KST_OFFSET_MS);

  const nextMidnightKst = new Date(
    Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate() + 1, 0, 0, 0, 0),
  );
  const nextMidnightUtc = new Date(nextMidnightKst.getTime() - KST_OFFSET_MS);

  return nextMidnightUtc.getTime() - now.getTime();
}

function resetAllGuildsActivity(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      resetActivity(guild.id);
    }
    logger.log(`일일 활동 자동 초기화 완료 (서버 ${client.guilds.cache.size}개)`);
  } catch (err) {
    logger.error('일일 활동 자동 초기화 중 오류', err);
  }
}

function scheduleDailyActivityReset(client) {
  if (client.__activityResetScheduled) {
    logger.status('활동 자동 초기화 타이머가 이미 실행 중이므로 재생성을 건너뜁니다.');
    return;
  }
  client.__activityResetScheduled = true;

  function runAndReschedule() {
    resetAllGuildsActivity(client);
    client.__activityResetTimeout = setTimeout(runAndReschedule, ONE_DAY_MS);
  }

  const delay = msUntilNextMidnightKST();
  client.__activityResetTimeout = setTimeout(runAndReschedule, delay);
  logger.log(`활동 자동 초기화 예약됨 (약 ${Math.round(delay / 60000)}분 후 첫 실행, 이후 24시간마다 반복)`);
}

module.exports = {
  scheduleDailyActivityReset,
};
