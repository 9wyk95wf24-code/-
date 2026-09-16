// deploy-commands.js
// 슬래시 명령어를 Discord에 등록합니다.
// GUILD_ID가 설정되어 있으면 해당 서버에만 즉시 등록(개발용, 반영 빠름),
// 없으면 전역 등록(모든 서버 반영까지 최대 1시간 소요될 수 있음)됩니다.
//
// 실행 방법: node deploy-commands.js

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('[ERROR] DISCORD_TOKEN과 CLIENT_ID 환경변수가 필요합니다.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[LOG] ${commands.length}개의 슬래시 명령어를 등록합니다...`);

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`[LOG] 서버(${GUILD_ID}) 전용으로 명령어를 등록했습니다. (즉시 반영)`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('[LOG] 전역 명령어로 등록했습니다. (반영까지 최대 1시간 소요될 수 있음)');
    }
  } catch (err) {
    console.error('[ERROR] 명령어 등록 실패', err);
    process.exit(1);
  }
})();
