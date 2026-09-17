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

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN이 없습니다.');
  process.exit(1);
}

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

client.commands = new Collection();
client.prefixCommands = new Collection();

const ROOT = __dirname;

const discordEvents = new Set([
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

function getRootJsFiles() {
  return fs
    .readdirSync(ROOT)
    .filter(file =>
      file.endsWith('.js') &&
      file !== 'index.js' &&
      file !== 'deploy-commands.js'
    );
}

/* =====================================
   명령어 자동 로드
===================================== */

for (const file of getRootJsFiles()) {

  try {

    const fullPath = path.join(ROOT, file);
    const mod = require(fullPath);

    /* 슬래시 명령어 */

    if (
      mod &&
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
    }

    /* 접두사 명령어 */

    if (
      mod &&
      typeof mod.name === 'string' &&
      typeof mod.execute === 'function' &&
      !discordEvents.has(mod.name)
    ) {

      client.prefixCommands.set(
        mod.name.toLowerCase(),
        mod
      );

      console.log(
        `✅ 접두사 명령어 로드: !${mod.name}`
      );
    }

  } catch (error) {

    console.log(
      `⚠️ ${file} 로드 실패: ${error.message}`
    );
  }
}

console.log(
  `📦 슬래시 명령어 ${client.commands.size}개 로드`
);

console.log(
  `📦 접두사 명령어 ${client.prefixCommands.size}개 로드`
);

/* =====================================
   이벤트 자동 로드
===================================== */

for (const file of getRootJsFiles()) {

  try {

    const fullPath = path.join(ROOT, file);
    const mod = require(fullPath);

    if (
      !mod ||
      typeof mod.name !== 'string' ||
      typeof mod.execute !== 'function'
    ) {
      continue;
    }

    if (!discordEvents.has(mod.name)) {
      continue;
    }

    /*
      아래 이벤트는 index.js에서 직접 처리
    */

    if (
      mod.name === 'messageCreate' ||
      mod.name === 'interactionCreate' ||
      mod.name === 'ready'
    ) {
      continue;
    }

    if (mod.once) {

      client.once(
        mod.name,
        (...args) =>
          mod.execute(...args, client)
      );

    } else {

      client.on(
        mod.name,
        (...args) =>
          mod.execute(...args, client)
      );
    }

    console.log(
      `✅ 이벤트 로드: ${mod.name}`
    );

  } catch (error) {

    console.log(
      `⚠️ 이벤트 ${file} 로드 실패: ${error.message}`
    );
  }
}

/* =====================================
   READY
===================================== */

client.once('ready', async () => {

  console.log('');
  console.log('====================================');
  console.log(`🤖 로그인 완료: ${client.user.tag}`);
  console.log(`🟢 상태: ONLINE`);
  console.log(`🏠 서버 수: ${client.guilds.cache.size}`);
  console.log(
    `⚡ 슬래시 명령어: ${client.commands.size}개`
  );
  console.log(
    `⌨️ 접두사 명령어: ${client.prefixCommands.size}개`
  );
  console.log('====================================');

  /* ===================================
     슬래시 명령어 서버 등록
  =================================== */

  const slashCommands = [
    ...client.commands.values()
  ].map(command =>
    command.data.toJSON()
  );

  for (const guild of client.guilds.cache.values()) {

    try {

      await guild.commands.set(
        slashCommands
      );

      console.log(
        `✅ 슬래시 명령어 등록: ${guild.name}`
      );

    } catch (error) {

      console.error(
        `❌ ${guild.name} 등록 실패:`,
        error.message
      );
    }
  }

  /* ===================================
     상태메시지 순환
  =================================== */

  const statuses = [
    '패밀리 관리중',
    '디톤님 도와주는중',
    '방송중',
    '듣는중'
  ];

  let statusIndex = 0;

  const updateStatus = () => {

    if (!client.user) {
      return;
    }

    client.user.setActivity(
      statuses[statusIndex],
      {
        type: ActivityType.Playing
      }
    );

    statusIndex++;

    if (
      statusIndex >= statuses.length
    ) {
      statusIndex = 0;
    }
  };

  updateStatus();

  setInterval(
    updateStatus,
    10000
  );
});

/* =====================================
   SLASH COMMAND
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

      return interaction.reply({
        content:
          '❌ 등록되지 않은 명령어입니다.',
        ephemeral: true
      }).catch(() => {});
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

      const content =
        '❌ 명령어 실행 중 오류가 발생했습니다.';

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .editReply({
            content
          })
          .catch(() => {});

      } else {

        await interaction
          .reply({
            content,
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

/* =====================================
   PREFIX COMMAND
===================================== */

client.on(
  'messageCreate',
  async message => {

    if (message.author.bot) {
      return;
    }

    const content =
      message.content.trim();

    if (!content.startsWith('!')) {
      return;
    }

    const parts =
      content
        .slice(1)
        .trim()
        .split(/\s+/);

    const commandName =
      (parts.shift() || '').toLowerCase();

    if (!commandName) {
      return;
    }

    /*
      봇상태는 아래 전용 처리
    */

    if (commandName === '봇상태') {
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
   !봇상태
   실시간 온라인 + 서버 정보
===================================== */

client.on(
  'messageCreate',
  async message => {

    if (message.author.bot) {
      return;
    }

    if (
      message.content.trim() !==
      '!봇상태'
    ) {
      return;
    }

    /*
      이 코드가 실행됐다는 것 자체가
      봇이 Discord에 연결되어 있다는 의미
    */

    const online =
      client.isReady();

    const status =
      online
        ? '🟢 온라인'
        : '🔴 오프라인';

    /* 서버 정보 */

    const guildCount =
      client.guilds.cache.size;

    const totalMembers =
      client.guilds.cache.reduce(
        (total, guild) =>
          total + (guild.memberCount || 0),
        0
      );

    /* 현재 서버 */

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

    /* 전체 서버 목록 */

    const guildList =
      client.guilds.cache
        .map(
          guild =>
            `• **${guild.name}** — ${guild.memberCount}명`
        )
        .join('\n');

    /* 가동시간 */

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
      guildList || '연결된 서버가 없습니다.',
      '',
      `🕐 확인시간: <t:${Math.floor(Date.now() / 1000)}:F>`
    ].join('\n');

    await message
      .reply(text)
      .catch(() => {});
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
