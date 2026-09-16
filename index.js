// index.js
// 봇의 메인 진입 파일입니다.
// - 클라이언트 초기화 및 로그인
// - commands/ 폴더의 슬래시 명령어를 client.commands에 등록
// - events/ 폴더의 이벤트 핸들러를 자동으로 등록
// - 프로세스 레벨 예외 처리로 봇이 예기치 않게 종료되지 않도록 방지

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const logger = require('./utils/logger');
const { seedOwners } = require('./utils/adminStore');

if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN 환경변수가 설정되어 있지 않습니다. .env 또는 호스팅 플랫폼의 환경변수를 확인해주세요.');
  process.exit(1);
}

// 최초 실행 시 1회, 지정된 오너 목록을 DB에 시드합니다 (이후에는 DB 값 기준으로 동작, 재시작해도 유지됨)
seedOwners();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // 입장/퇴장/역할 로그, 자동 역할 지급에 필요 (Discord 개발자 포털에서 활성화 필요)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 메시지 내용 기반 릴레이/필터/접두사 명령어에 필요 (Discord 개발자 포털에서 활성화 필요)
    GatewayIntentBits.GuildPresences, // /stats의 온라인 멤버 수 계산에 필요 (Discord 개발자 포털에서 활성화 필요)
    GatewayIntentBits.GuildVoiceStates, // 음성채널 활동(접속 시간) 추적에 필요
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ---------- 슬래시 명령어 로드 ----------
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
let commandFiles = [];
if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
  logger.log('commands/ directory created (was missing)');
} else {
  commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
}

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command?.data || !command?.execute) {
      logger.warn(`잘못된 명령어 파일 형식: ${file}`);
      continue;
    }
    client.commands.set(command.data.name, command);
  } catch (err) {
    logger.error(`명령어 로드 실패: ${file}`, err);
  }
}
logger.log(`${client.commands.size}개의 명령어를 로드했습니다.`);

// ---------- 접두사(!) 명령어 로드 ----------
client.prefixCommands = new Collection();
const prefixCommandsPath = path.join(__dirname, 'commands-prefix');

if (fs.existsSync(prefixCommandsPath)) {
  const prefixCommandFiles = fs.readdirSync(prefixCommandsPath).filter((file) => file.endsWith('.js'));

  for (const file of prefixCommandFiles) {
    try {
      const command = require(path.join(prefixCommandsPath, file));
      if (!command?.name || !command?.execute) {
        logger.warn(`잘못된 접두사 명령어 파일 형식: ${file}`);
        continue;
      }
      client.prefixCommands.set(command.name, command);
    } catch (err) {
      logger.error(`접두사 명령어 로드 실패: ${file}`, err);
    }
  }
}
logger.log(`${client.prefixCommands.size}개의 접두사(!) 명령어를 로드했습니다.`);

// ---------- 이벤트 핸들러 로드 ----------
const eventsPath = path.join(__dirname, 'events');
let eventFiles = [];
if (!fs.existsSync(eventsPath)) {
  fs.mkdirSync(eventsPath, { recursive: true });
  logger.log('events/ directory created (was missing)');
} else {
  eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
}

for (const file of eventFiles) {
  try {
    const event = require(path.join(eventsPath, file));
    if (!event?.name || !event?.execute) {
      logger.warn(`잘못된 이벤트 파일 형식: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else if (event.name === 'ready') {
      // ready 이벤트는 client 인자가 필요하므로 별도 처리
      client.on(event.name, () => event.execute(client));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  } catch (err) {
    logger.error(`이벤트 로드 실패: ${file}`, err);
  }
}
logger.log(`${eventFiles.length}개의 이벤트 핸들러를 로드했습니다.`);

// ---------- 프로세스 레벨 안전장치 ----------
// 어떤 곳에서 예외가 발생해도 봇 프로세스 전체가 죽지 않도록 마지막 방어선을 둡니다.
process.on('unhandledRejection', (reason) => {
  logger.error('처리되지 않은 Promise 거부(unhandledRejection)', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('처리되지 않은 예외(uncaughtException)', err);
});

client.on('warn', (info) => logger.warn(info));

// ---------- 로그인 ----------
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error('로그인 실패. DISCORD_TOKEN 값을 확인해주세요.', err);
  process.exit(1);
});
