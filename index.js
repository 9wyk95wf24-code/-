require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require('discord.js');

/*
 * ==========================================
 * 디톤 관리봇 - 메인 실행 파일
 * ==========================================
 *
 * 기능
 * - Discord 로그인
 * - 슬래시 명령어 로드
 * - ! 접두사 명령어 로드
 * - messageCreate 이벤트 로드
 * - interactionCreate 이벤트 로드
 * - 음성 관련 이벤트 로드
 * - Railway 실행 로그 출력
 *
 * 기존 일부 파일에서 ../utils/파일명 형태로
 * 불러오는 문제를 호환 처리합니다.
 */

// ==========================================
// utils 경로 호환 처리
// ==========================================

const Module = require('module');
const originalLoad = Module._load;

const ROOT_UTIL_NAMES = new Set([
  'logger',
  'database',
  'relay',
  'spamGuard',
  'linkFilter',
  'wordFilter',
  'activityTracker',
  'permissions',
  'adminStore',
  'tickets',
]);

Module._load = function (request, parent, isMain) {
  const match = request.match(/(?:\.\.\/|\.\/)?utils\/([^/]+)$/);

  if (match && ROOT_UTIL_NAMES.has(match[1])) {
    const rootFile = path.join(__dirname, `${match[1]}.js`);

    if (fs.existsSync(rootFile)) {
      return originalLoad.call(
        this,
        rootFile,
        parent,
        isMain
      );
    }
  }

  if (
    request.startsWith('./') &&
    ROOT_UTIL_NAMES.has(request.slice(2))
  ) {
    const rootFile = path.join(
      __dirname,
      `${request.slice(2)}.js`
    );

    if (fs.existsSync(rootFile)) {
      return originalLoad.call(
        this,
        rootFile,
        parent,
        isMain
      );
    }
  }

  return originalLoad.call(
    this,
    request,
    parent,
    isMain
  );
};

// ==========================================
// 환경변수
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error(
    '❌ DISCORD_TOKEN 환경변수가 없습니다.'
  );

  process.exit(1);
}

// ==========================================
// Discord Client
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],

  partials: [
    Partials.Channel,
  ],
});

// ==========================================
// Collection
// ==========================================

client.commands = new Collection();
client.prefixCommands = new Collection();

// ==========================================
// 명령어 / 이벤트 로드
// ==========================================

const ROOT = __dirname;

const files = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('.js'));

let loadedEvents = 0;
let loadedSlashCommands = 0;
let loadedPrefixCommands = 0;

for (const file of files) {
  if (
    file === 'index.js' ||
    file === 'deploy-commands.js'
  ) {
    continue;
  }

  const fullPath = path.join(ROOT, file);

  try {
    delete require.cache[
      require.resolve(fullPath)
    ];

    const mod = require(fullPath);

    if (!mod) {
      continue;
    }

    // ========================================
    // 이벤트 모듈
    // ========================================

    if (
      typeof mod.name === 'string' &&
      typeof mod.execute === 'function' &&
      [
        'ready',
        'messageCreate',
        'interactionCreate',
        'voiceStateUpdate',
        'guildMemberAdd',
        'guildMemberRemove',
        'guildMemberUpdate',
      ].includes(mod.name)
    ) {
      const handler = (...args) => {
        Promise.resolve(
          mod.execute(...args)
        ).catch((err) => {
          console.error(
            `❌ 이벤트 오류 [${mod.name}]`,
            err
          );
        });
      };

      if (mod.once) {
        client.once(
          mod.name,
          handler
        );
      } else {
        client.on(
          mod.name,
          handler
        );
      }

      loadedEvents++;

      console.log(
        `📡 이벤트 로드: ${mod.name} <- ${file}`
      );

      continue;
    }

    // ========================================
    // Slash 명령어
    // ========================================

    if (
      mod.data &&
      typeof mod.execute === 'function' &&
      mod.data.name
    ) {
      client.commands.set(
        mod.data.name,
        mod
      );

      loadedSlashCommands++;

      console.log(
        `⚡ 슬래시 명령어 로드: /${mod.data.name}`
      );

      continue;
    }

    // ========================================
    // Prefix 명령어
    // ========================================

    if (
      typeof mod.execute === 'function'
    ) {
      const commandName =
        typeof mod.name === 'string'
          ? mod.name
          : typeof mod.command === 'string'
            ? mod.command
            : null;

      if (
        commandName &&
        !mod.data
      ) {
        const cleanName =
          commandName.replace(/^!/, '');

        client.prefixCommands.set(
          cleanName,
          mod
        );

        loadedPrefixCommands++;

        console.log(
          `🔧 접두사 명령어 로드: !${cleanName}`
        );
      }
    }

  } catch (err) {
    console.error(
      `⚠️ 모듈 로드 실패: ${file}`
    );

    console.error(
      err?.stack || err
    );
  }
}

// ==========================================
// 상태 메시지
// ==========================================

const statusMessages = [
  '패밀리 관리중',
  '디톤님 도와주는중',
  '방송중',
  '듣는중',
];

let statusIndex = 0;

// ==========================================
// Ready
// ==========================================

client.once(
  'ready',
  () => {

    console.log('');
    console.log(
      '=========================================='
    );

    console.log(
      `✅ 디스코드 로그인 성공: ${client.user.tag}`
    );

    console.log(
      `🤖 봇 온라인`
    );

    console.log(
      `🏠 서버: ${client.guilds.cache.size}개`
    );

    console.log(
      `⚡ 슬래시 명령어: ${loadedSlashCommands}개`
    );

    console.log(
      `🔧 접두사 명령어: ${loadedPrefixCommands}개`
    );

    console.log(
      `📡 이벤트: ${loadedEvents}개`
    );

    console.log(
      '=========================================='
    );

    console.log('');

    // ========================================
    // 상태 메시지 변경
    // ========================================

    const updateStatus = () => {

      if (!client.user) {
        return;
      }

      client.user.setPresence({
        activities: [
          {
            name: statusMessages[
              statusIndex
            ],

            type: ActivityType.Playing,
          },
        ],

        status: 'online',
      });

      console.log(
        `🎮 상태 변경: ${statusMessages[statusIndex]}`
      );

      statusIndex =
        (statusIndex + 1) %
        statusMessages.length;
    };

    updateStatus();

    // 30초마다 상태 변경
    setInterval(
      updateStatus,
      30 * 1000
    );
  }
);

// ==========================================
// Discord Client 오류
// ==========================================

client.on(
  'error',
  (error) => {
    console.error(
      '❌ Discord Client 오류:',
      error
    );
  }
);

// ==========================================
// Discord Warn
// ==========================================

client.on(
  'warn',
  (warning) => {
    console.warn(
      '⚠️ Discord 경고:',
      warning
    );
  }
);

// ==========================================
// 처리되지 않은 Promise 오류
// ==========================================

process.on(
  'unhandledRejection',
  (error) => {
    console.error(
      '❌ 처리되지 않은 Promise 오류:',
      error
    );
  }
);

// ==========================================
// 처리되지 않은 예외
// ==========================================

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      '❌ 처리되지 않은 예외:',
      error
    );
  }
);

// ==========================================
// 시작
// ==========================================

console.log('');
console.log(
  '🚀 디톤 관리봇 시작 중...'
);

console.log(
  '📦 모듈을 불러오는 중...'
);

console.log(
  `⚡ 슬래시 명령어 ${loadedSlashCommands}개`
);

console.log(
  `🔧 접두사 명령어 ${loadedPrefixCommands}개`
);

console.log(
  `📡 이벤트 ${loadedEvents}개`
);

console.log('');

// ==========================================
// Discord 로그인
// ==========================================

client
  .login(TOKEN)
  .then(() => {
    console.log(
      '🔑 Discord 로그인 요청 성공'
    );
  })
  .catch((error) => {

    console.error(
      '❌ 디스코드 로그인 실패'
    );

    console.error(
      error?.stack || error
    );

    process.exit(1);
  });
