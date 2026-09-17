require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Module = require('module');

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
} = require('discord.js');

/* =========================================================
   디톤 관리봇 - index.js
   ========================================================= */

const ROOT = __dirname;

/* =========================================================
   기존 파일들의 utils 경로 호환
   ========================================================= */

const originalLoad = Module._load;

const UTILS = new Set([
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
  try {
    /*
     * ../utils/logger
     * ./utils/logger
     */
    const utilsMatch = request.match(
      /^(?:\.\.\/|\.\/)utils\/([^/]+)$/
    );

    if (utilsMatch && UTILS.has(utilsMatch[1])) {
      const name = utilsMatch[1];

      const rootFile = path.join(
        ROOT,
        `${name}.js`
      );

      const utilsFile = path.join(
        ROOT,
        'utils',
        `${name}.js`
      );

      if (fs.existsSync(rootFile)) {
        return originalLoad.call(
          this,
          rootFile,
          parent,
          isMain
        );
      }

      if (fs.existsSync(utilsFile)) {
        return originalLoad.call(
          this,
          utilsFile,
          parent,
          isMain
        );
      }
    }

    /*
     * ./logger
     * ./database
     * ./adminStore
     * etc.
     *
     * 루트에 없으면 utils에서 찾습니다.
     */
    if (
      request.startsWith('./') &&
      !request.startsWith('../') &&
      UTILS.has(request.slice(2))
    ) {
      const name = request.slice(2);

      const rootFile = path.join(
        ROOT,
        `${name}.js`
      );

      const utilsFile = path.join(
        ROOT,
        'utils',
        `${name}.js`
      );

      if (fs.existsSync(rootFile)) {
        return originalLoad.call(
          this,
          rootFile,
          parent,
          isMain
        );
      }

      if (fs.existsSync(utilsFile)) {
        return originalLoad.call(
          this,
          utilsFile,
          parent,
          isMain
        );
      }
    }
  } catch (error) {
    console.error(
      '⚠️ 모듈 경로 처리 오류:',
      error
    );
  }

  return originalLoad.call(
    this,
    request,
    parent,
    isMain
  );
};

/* =========================================================
   환경변수
   ========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error(
    '❌ DISCORD_TOKEN 환경변수가 없습니다.'
  );

  process.exit(1);
}

/* =========================================================
   Discord Client
   ========================================================= */

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

/* =========================================================
   Collections
   ========================================================= */

client.commands = new Collection();
client.prefixCommands = new Collection();

/* =========================================================
   로드 카운터
   ========================================================= */

let loadedEvents = 0;
let loadedSlashCommands = 0;
let loadedPrefixCommands = 0;

/* =========================================================
   이벤트 이름
   ========================================================= */

const EVENT_NAMES = new Set([
  'ready',
  'messageCreate',
  'interactionCreate',
  'voiceStateUpdate',
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
]);

/* =========================================================
   모듈 하나 로드
   ========================================================= */

function loadModule(filePath, displayName) {
  try {
    delete require.cache[
      require.resolve(filePath)
    ];

    const mod = require(filePath);

    if (!mod) {
      return;
    }

    /* -----------------------------------------------------
       이벤트
       ----------------------------------------------------- */

    if (
      typeof mod.name === 'string' &&
      typeof mod.execute === 'function' &&
      EVENT_NAMES.has(mod.name)
    ) {
      /*
       * index.js에서 직접 ready를 등록하므로
       * ready 이벤트는 중복 등록하지 않습니다.
       */
      if (mod.name === 'ready') {
        return;
      }

      const handler = (...args) => {
        Promise.resolve(
          mod.execute(...args)
        ).catch((error) => {
          console.error(
            `❌ 이벤트 실행 오류 [${mod.name}]`,
            error
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
        `📡 이벤트 로드: ${mod.name} <- ${displayName}`
      );

      return;
    }

    /* -----------------------------------------------------
       Slash Command
       ----------------------------------------------------- */

    if (
      mod.data &&
      typeof mod.execute === 'function' &&
      typeof mod.data.name === 'string'
    ) {
      const commandName =
        mod.data.name;

      client.commands.set(
        commandName,
        mod
      );

      loadedSlashCommands++;

      console.log(
        `⚡ 슬래시 명령어 로드: /${commandName}`
      );

      return;
    }

    /* -----------------------------------------------------
       Prefix Command
       ----------------------------------------------------- */

    if (
      typeof mod.execute === 'function' &&
      typeof mod.name === 'string' &&
      !mod.data
    ) {
      /*
       * 이벤트 이름은 Prefix 명령어로 등록하지 않습니다.
       */
      if (EVENT_NAMES.has(mod.name)) {
        return;
      }

      const commandName =
        mod.name.replace(/^!/, '');

      /*
       * 이름이 너무 이상한 일반 모듈은
       * 명령어로 등록하지 않습니다.
       */
      if (!commandName) {
        return;
      }

      client.prefixCommands.set(
        commandName,
        mod
      );

      loadedPrefixCommands++;

      console.log(
        `🔧 접두사 명령어 로드: !${commandName}`
      );
    }

  } catch (error) {
    console.error(
      `⚠️ 모듈 로드 실패: ${displayName}`
    );

    console.error(
      error?.stack || error
    );
  }
}

/* =========================================================
   루트 JS 파일 로드
   ========================================================= */

function loadRootModules() {
  let files = [];

  try {
    files = fs
      .readdirSync(ROOT)
      .filter((file) =>
        file.endsWith('.js')
      );
  } catch (error) {
    console.error(
      '❌ 루트 파일 목록을 읽을 수 없습니다.',
      error
    );

    return;
  }

  /*
   * index.js / deploy-commands.js 제외
   */
  for (const file of files) {
    if (
      file === 'index.js' ||
      file === 'deploy-commands.js'
    ) {
      continue;
    }

    const fullPath =
      path.join(ROOT, file);

    loadModule(
      fullPath,
      file
    );
  }
}

/* =========================================================
   시작
   ========================================================= */

console.log('');
console.log(
  '=========================================='
);

console.log(
  '🚀 디톤 관리봇 시작 중...'
);

console.log(
  '📦 모듈을 불러오는 중...'
);

console.log(
  '=========================================='
);

console.log('');

/* 모듈 로드 */
loadRootModules();

/* =========================================================
   상태 메시지
   ========================================================= */

const statusMessages = [
  '패밀리 관리중',
  '디톤님 도와주는중',
  '방송중',
  '듣는중',
];

let statusIndex = 0;

/* =========================================================
   Ready
   ========================================================= */

client.once(
  'ready',
  async () => {
    console.log('');

    console.log(
      '=========================================='
    );

    console.log(
      `✅ 디스코드 로그인 성공: ${client.user.tag}`
    );

    console.log(
      '🤖 봇 온라인'
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

    /* -----------------------------------------------------
       관리자 Store 초기화
       ----------------------------------------------------- */

    try {
      const adminStorePath =
        path.join(
          ROOT,
          'adminStore.js'
        );

      if (
        fs.existsSync(
          adminStorePath
        )
      ) {
        const adminStore =
          require(adminStorePath);

        if (
          typeof adminStore.seedOwners ===
          'function'
        ) {
          adminStore.seedOwners();

          console.log(
            '👑 오너 정보 초기화 완료'
          );
        }
      }
    } catch (error) {
      console.error(
        '⚠️ 오너 정보 초기화 실패:',
        error
      );
    }

    /* -----------------------------------------------------
       상태 메시지
       ----------------------------------------------------- */

    const updateStatus = () => {
      if (!client.user) {
        return;
      }

      const currentStatus =
        statusMessages[
          statusIndex
        ];

      client.user.setPresence({
        activities: [
          {
            name: currentStatus,
            type: ActivityType.Playing,
          },
        ],

        status: 'online',
      });

      console.log(
        `🎮 상태 변경: ${currentStatus}`
      );

      statusIndex =
        (statusIndex + 1) %
        statusMessages.length;
    };

    updateStatus();

    /*
     * 30초마다 변경
     */
    setInterval(
      updateStatus,
      30 * 1000
    );
  }
);

/* =========================================================
   Discord Client Error
   ========================================================= */

client.on(
  'error',
  (error) => {
    console.error(
      '❌ Discord Client 오류:',
      error
    );
  }
);

/* =========================================================
   Discord Warning
   ========================================================= */

client.on(
  'warn',
  (warning) => {
    console.warn(
      '⚠️ Discord 경고:',
      warning
    );
  }
);

/* =========================================================
   Unhandled Rejection
   ========================================================= */

process.on(
  'unhandledRejection',
  (error) => {
    console.error(
      '❌ 처리되지 않은 Promise 오류:',
      error
    );
  }
);

/* =========================================================
   Uncaught Exception
   ========================================================= */

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      '❌ 처리되지 않은 예외:',
      error
    );
  }
);

/* =========================================================
   최종 시작 로그
   ========================================================= */

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

/* =========================================================
   Discord 로그인
   ========================================================= */

console.log(
  '🔑 Discord 로그인 요청 중...'
);

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
