require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType
} = require('discord.js');

/* =====================================
   환경변수
===================================== */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN 환경변수가 없습니다.');
  process.exit(1);
}

/* =====================================
   CLIENT
===================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],

  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

/* =====================================
   COLLECTION
===================================== */

client.commands = new Collection();
client.prefixCommands = new Collection();

/* =====================================
   경로
===================================== */

const ROOT = __dirname;

/* =====================================
   Discord 이벤트 파일 목록
===================================== */

const DISCORD_EVENTS = new Set([
  'ready',
  'messageCreate',
  'messageDelete',
  'messageUpdate',
  'interactionCreate',
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
  'voiceStateUpdate',
  'presenceUpdate',
  'channelCreate',
  'channelDelete',
  'channelUpdate',
  'roleCreate',
  'roleDelete',
  'roleUpdate',
  'guildCreate',
  'guildDelete',
  'error',
  'warn',
  'shardReconnecting',
  'shardResume'
]);

/* =====================================
   루트 JS 파일 가져오기
===================================== */

function getRootFiles() {
  return fs
    .readdirSync(ROOT)
    .filter(file => {
      return (
        file.endsWith('.js') &&
        file !== 'index.js' &&
        file !== 'deploy-commands.js'
      );
    });
}

/* =====================================
   모듈 안전 로드
===================================== */

function loadModule(file) {
  try {
    return require(path.join(ROOT, file));
  } catch (error) {
    console.error(
      `⚠️ ${file} 로드 실패: ${error.message}`
    );

    return null;
  }
}

/* =====================================
   명령어 로드
===================================== */

const rootFiles = getRootFiles();

for (const file of rootFiles) {
  const mod = loadModule(file);

  if (!mod) {
    continue;
  }

  /* -----------------------------
     슬래시 명령어
  ----------------------------- */

  if (
    mod.data &&
    typeof mod.execute === 'function' &&
    mod.data.name
  ) {
    client.commands.set(
      mod.data.name,
      mod
    );

    console.log(
      `✅ 슬래시 명령어 로드: /${mod.data.name}`
    );

    continue;
  }

  /* -----------------------------
     이벤트 파일은 제외
  ----------------------------- */

  if (
    typeof mod.name === 'string' &&
    DISCORD_EVENTS.has(mod.name)
  ) {
    continue;
  }

  /* -----------------------------
     접두사 명령어
  ----------------------------- */

  if (
    typeof mod.name === 'string' &&
    typeof mod.execute === 'function'
  ) {
    const commandName =
      mod.name.toLowerCase();

    client.prefixCommands.set(
      commandName,
      mod
    );

    console.log(
      `✅ 접두사 명령어 로드: !${mod.name}`
    );
  }
}

console.log('');
console.log(
  `📦 슬래시 명령어: ${client.commands.size}개`
);

console.log(
  `📦 접두사 명령어: ${client.prefixCommands.size}개`
);

/* =====================================
   이벤트 로드
===================================== */

for (const file of rootFiles) {
  const mod = loadModule(file);

  if (!mod) {
    continue;
  }

  if (
    typeof mod.name !== 'string' ||
    typeof mod.execute !== 'function'
  ) {
    continue;
  }

  if (!DISCORD_EVENTS.has(mod.name)) {
    continue;
  }

  /*
    index.js에서 직접 처리하는 이벤트
  */

  if (
    mod.name === 'ready' ||
    mod.name === 'messageCreate' ||
    mod.name === 'interactionCreate'
  ) {
    continue;
  }

  try {
    if (mod.once) {
      client.once(
        mod.name,
        (...args) => {
          try {
            mod.execute(...args, client);
          } catch (error) {
            console.error(
              `❌ 이벤트 ${mod.name} 오류:`,
              error
            );
          }
        }
      );
    } else {
      client.on(
        mod.name,
        (...args) => {
          try {
            mod.execute(...args, client);
          } catch (error) {
            console.error(
              `❌ 이벤트 ${mod.name} 오류:`,
              error
            );
          }
        }
      );
    }

    console.log(
      `✅ 이벤트 로드: ${mod.name}`
    );

  } catch (error) {
    console.error(
      `❌ 이벤트 등록 실패: ${mod.name}`,
      error
    );
  }
}

/* =====================================
   READY
===================================== */

client.once('ready', async () => {

  console.log('');
  console.log('====================================');
  console.log('🤖 디톤 패밀리 관리봇');
  console.log('====================================');
  console.log(
    `👤 로그인: ${client.user.tag}`
  );
  console.log('🟢 상태: ONLINE');
  console.log(
    `🏠 서버: ${client.guilds.cache.size}개`
  );
  console.log(
    `⚡ 슬래시: ${client.commands.size}개`
  );
  console.log(
    `⌨️ 접두사: ${client.prefixCommands.size}개`
  );
  console.log('====================================');

  /* ===================================
     슬래시 명령어 서버 등록
  =================================== */

  const slashCommands = [
    ...client.commands.values()
  ]
    .filter(command => {
      return (
        command.data &&
        typeof command.data.toJSON === 'function'
      );
    })
    .map(command => {
      return command.data.toJSON();
    });

  for (const guild of client.guilds.cache.values()) {

    try {

      await guild.commands.set(
        slashCommands
      );

      console.log(
        `✅ 명령어 등록 완료: ${guild.name}`
      );

    } catch (error) {

      console.error(
        `❌ ${guild.name} 명령어 등록 실패:`,
        error.message
      );
    }
  }

  /* ===================================
     상태메시지
  =================================== */

  const statuses = [
    '패밀리 관리중',
    '디톤님 도와주는중',
    '방송중',
    '듣는중'
  ];

  let statusIndex = 0;

  function updateStatus() {

    if (!client.user) {
      return;
    }

    client.user.setActivity(
      statuses[statusIndex],
      {
        type: ActivityType.Playing
      }
    );

    statusIndex =
      (statusIndex + 1) %
      statuses.length;
  }

  updateStatus();

  setInterval(
    updateStatus,
    10000
  );
});

/* =====================================
   슬래시 명령어
===================================== */

client.on(
  'interactionCreate',
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command =
      client.commands.get(
        interaction.commandName
      );

    if (!command) {

      await interaction.reply({
        content:
          '❌ 등록되지 않은 명령어입니다.',
        ephemeral: true
      }).catch(() => {});

      return;
    }

    try {

      await command.execute(
        interaction,
        client
      );

    } catch (error) {

      console.error(
        `❌ /${interaction.commandName} 오류:`,
        error
      );

      const reply = {
        content:
          '❌ 명령어 실행 중 오류가 발생했습니다.',
        ephemeral: true
      };

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .editReply(reply)
          .catch(() => {});

      } else {

        await interaction
          .reply(reply)
          .catch(() => {});
      }
    }
  }
);

/* =====================================
   메시지 / 접두사 명령어
===================================== */

client.on(
  'messageCreate',
  async message => {

    if (message.author.bot) {
      return;
    }

    const content =
      message.content.trim();

    /* =================================
       !봇상태
    ================================= */

    if (
      content === '!봇상태'
    ) {

      const online =
        client.isReady();

      const status =
        online
          ? '🟢 온라인'
          : '🔴 오프라인';

      const guildCount =
        client.guilds.cache.size;

      const totalMembers =
        client.guilds.cache.reduce(
          (total, guild) => {
            return total +
              (guild.memberCount || 0);
          },
          0
        );

      const currentGuild =
        message.guild;

      let currentServerInfo =
        'DM에서 실행됨';

      if (currentGuild) {

        currentServerInfo = [
          `🏠 서버명: **${currentGuild.name}**`,
          `🆔 서버 ID: **${currentGuild.id}**`,
          `👥 서버 인원: **${currentGuild.memberCount}명**`,
          `📅 서버 생성일: <t:${Math.floor(currentGuild.createdTimestamp / 1000)}:D>`
        ].join('\n');
      }

      const guildList =
        client.guilds.cache
          .map(guild => {
            return `• **${guild.name}** — ${guild.memberCount}명`;
          })
          .join('\n');

      const uptime =
        Math.floor(
          (client.uptime || 0) / 1000
        );

      const days =
        Math.floor(
          uptime / 86400
        );

      const hours =
        Math.floor(
          (uptime % 86400) / 3600
        );

      const minutes =
        Math.floor(
          (uptime % 3600) / 60
        );

      const seconds =
        uptime % 60;

      const uptimeText =
        `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;

      const text = [
        '🤖 **디톤 패밀리 관리봇 상태**',
        '',
        `📡 봇 상태: **${status}**`,
        `🏓 Discord Ping: **${client.ws.ping}ms**`,
        `⏱️ 가동시간: **${uptimeText}**`,
        '',
        '📊 **전체 서버 정보**',
        `🏠 연결된 서버: **${guildCount}개**`,
        `👥 전체 서버 인원: **${totalMembers}명**`,
        `⚡ 슬래시 명령어: **${client.commands.size}개**`,
        `⌨️ 접두사 명령어: **${client.prefixCommands.size}개**`,
        '',
        '📌 **현재 서버 정보**',
        currentServerInfo,
        '',
        '🌐 **연결된 서버 목록**',
        guildList ||
          '연결된 서버가 없습니다.',
        '',
        `🕐 확인시간: <t:${Math.floor(Date.now() / 1000)}:F>`
      ].join('\n');

      await message
        .reply(text)
        .catch(() => {});

      return;
    }

    /* =================================
       접두사 명령어
    ================================= */

    if (!content.startsWith('!')) {
      return;
    }

    const parts =
      content
        .slice(1)
        .trim()
        .split(/\s+/);

    const commandName =
      (parts.shift() || '')
        .toLowerCase();

    if (!commandName) {
      return;
    }

    const command =
      client.prefixCommands.get(
        commandName
      );

    if (!command) {
      return;
    }

    try {

      await command.execute(
        message,
        parts,
        client
      );

    } catch (error) {

      console.error(
        `❌ !${commandName} 오류:`,
        error
      );

      await message
        .reply(
          '❌ 명령어 실행 중 오류가 발생했습니다.'
        )
        .catch(() => {});
    }
  }
);

/* =====================================
   Discord 오류
===================================== */

client.on(
  'error',
  error => {

    console.error(
      '❌ Discord Client Error:',
      error
    );
  }
);

client.on(
  'warn',
  warning => {

    console.warn(
      '⚠️ Discord Warning:',
      warning
    );
  }
);

/* =====================================
   프로세스 오류
===================================== */

process.on(
  'unhandledRejection',
  error => {

    console.error(
      '❌ Unhandled Rejection:',
      error
    );
  }
);

process.on(
  'uncaughtException',
  error => {

    console.error(
      '❌ Uncaught Exception:',
      error
    );
  }
);

/* =====================================
   LOGIN
===================================== */

client
  .login(TOKEN)
  .then(() => {

    console.log(
      '🔐 Discord 로그인 요청 완료'
    );

  })
  .catch(error => {

    console.error(
      '❌ Discord 로그인 실패:',
      error
    );

    process.exit(1);
  });
