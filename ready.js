// events/ready.js
// 봇이 준비되면 상태 메시지를 주기적으로 순환합니다.
// ready 이벤트가 재연결 등으로 여러 번 발생해도 타이머가 중복 생성되지 않도록
// client 객체에 플래그를 저장해 방지합니다.

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { scheduleDailyActivityReset } = require('../utils/activityScheduler');

const STATUS_LIST = [
  { name: '패밀리 관리중', type: ActivityType.Playing },
  { name: '디톤님 도와주는중', type: ActivityType.Playing },
  { name: '방송중', type: ActivityType.Streaming, url: process.env.STREAM_URL || undefined },
  { name: '듣는중', type: ActivityType.Listening },
];

function applyStatus(client, index) {
  const status = STATUS_LIST[index];
  try {
    client.user.setActivity(status.name, {
      type: status.type,
      url: status.type === ActivityType.Streaming ? status.url : undefined,
    });
    logger.status(`상태 변경: ${status.name}`);
  } catch (err) {
    logger.error('상태 메시지 설정 실패', err);
  }
}

module.exports = {
  name: 'ready',
  once: false, // 재연결 시에도 로그를 남기기 위해 once가 아닌 on으로 등록하되, 내부에서 중복 방지 처리
  async execute(client) {
    logger.log(`로그인 완료: ${client.user.tag}`);

    // 이미 상태 순환 타이머가 실행 중이면 다시 만들지 않음 (재연결 시 중복 방지)
    if (client.__statusIntervalStarted) {
      logger.status('상태 순환 타이머가 이미 실행 중이므로 재생성을 건너뜁니다.');
      return;
    }
    client.__statusIntervalStarted = true;

    let index = 0;
    applyStatus(client, index); // 로그인 직후 첫 상태 즉시 표시

    const intervalMs = Number(process.env.STATUS_INTERVAL || 30000);
    client.__statusInterval = setInterval(() => {
      index = (index + 1) % STATUS_LIST.length;
      applyStatus(client, index);
    }, intervalMs);

    // 활동(메시지/음성) 일일 자동 초기화 예약 (KST 자정 기준, 중복 예약 방지 포함)
    scheduleDailyActivityReset(client);
  },
};
