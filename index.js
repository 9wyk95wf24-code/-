// index.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require('discord.js');

const logger = require('./utils/logger');
const { seedOwners } = require('./utils/adminStore');

if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN 환경변수가 설정되어 있지 않습니다.');
  process.exit(1);
}

seedOwners();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
  ],
});

// 존재하지 않는 폴더 때문에 봇이 꺼지지 않도록 처리
const safeReadJsFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.js'));
};

// ==============================
// 슬래시 명령어 로드
// ==============================

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');

for (const file of safeReadJsFiles(commandsPath)) {
  try {
    const command = require(path.join(commandsPath, file));

    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  } catch (err) {
    logger.error(`명령어 로드 실패: ${file}`, err);
  }
}

logger.log(`${client.commands.size}개의 슬래시 명령어를 로드했습니다.`);

// ==============================
// 접두사 명령어 로드
// ==============================

client.prefixCommands = new Collection();

const prefixCommandsPath = path.join(
  __dirname,
  'commands-prefix'
);

for (const file of safeReadJsFiles(prefixCommandsPath)) {
  try {
    const command = require(
      path.join(prefixCommandsPath, file)
    );

    if (command?.name && command?.execute) {
      client.prefixCommands.set(command.name, command);
    }
  } catch (err) {
    logger.error(
      `접두사 명령어 로드 실패: ${file}`,
      err
    );
  }
}

logger.log(
  `${client.prefixCommands.size}개의 접두사 명령어를 로드했습니다.`
);

// ==============================
// 이벤트 핸들러 로드
// ==============================

const eventsPath = path.join(__dirname, 'events');

for (const file of safeReadJsFiles(eventsPath)) {
  try {
    const event = require(
      path.join(eventsPath, file)
    );

    if (!event?.name || !event?.execute) {
      continue;
    }

    if (event.once) {
      client.once(
        event.name,
        (...args) => event.execute(...args, client)
      );
    } else {
      client.on(
        event.name,
        (...args) => event.execute(...args, client)
      );
    }
  } catch (err) {
    logger.error(
      `이벤트 로드 실패: ${file}`,
      err
    );
  }
}

// ==============================
// !봇상태
// ==============================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim() !== '!봇상태') return;

  const formatUptime = () => {
    const totalSeconds = Math.floor(
      (client.uptime || 0) / 1000
    );

    const days = Math.floor(
      totalSeconds / 86400
    );

    const hours = Math.floor(
      (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
  };

  const makeStatusMessage = () => {
    const status = client.isReady()
      ? '🟢 온라인'
      : '🔴 오프라인';

    const ping = client.ws.ping;

    const lastCheck = Math.floor(
      Date.now() / 1000
    );

    return [
      `🤖 **현재 봇 상태는 ${status} 입니다.**`,
      '',
      `📡 핑: **${ping}ms**`,
      `⏱️ 가동시간: **${formatUptime()}**`,
      `🔄 마지막 확인: <t:${lastCheck}:T>`,
    ].join('\n');
  };

  try {
    const sentMessage = await message.reply(
      makeStatusMessage()
    );

    // 5초마다 실시간 갱신
    const updateTimer = setInterval(async () => {
      try {
        await sentMessage.edit(
          makeStatusMessage()
        );
      } catch (err) {
        clearInterval(updateTimer);
      }
    }, 5000);

    // 최대 5분 동안 갱신
    setTimeout(() => {
      clearInterval(updateTimer);
    }, 5 * 60 * 1000);

  } catch (err) {
    logger.error(
      '!봇상태 응답 실패',
      err
    );
  }
});

// ==============================
// 오류 방지
// ==============================

process.on(
  'unhandledRejection',
  (reason) => {
    logger.error(
      '처리되지 않은 Promise 거부',
      reason
    );
  }
);

process.on(
  'uncaughtException',
  (err) => {
    logger.error(
      '처리되지 않은 예외',
      err
    );
  }
);

client.on(
  'warn',
  (info) => {
    logger.warn(info);
  }
);

// ==============================
// 봇 로그인
// ==============================

client.login(
  process.env.DISCORD_TOKEN
).catch((err) => {
  logger.error(
    '로그인 실패. DISCORD_TOKEN 값을 확인해주세요.',
    err
  );

  process.exit(1);
});
