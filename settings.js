// commands/settings.js
// 서버별 설정을 관리하는 명령어입니다 (요구사항 30번: 관리자 설정 시스템).
// 로그/환영/퇴장 채널, 자동 역할, 링크/금칙어 필터, 스팸 방지, 릴레이 쌍을 관리합니다.

const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { PermissionFlagsBits, blockIfNoPermission } = require('../utils/permissions');
const { getGuildSettings, updateGuildSettings } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('설정')
    .setDescription('서버 설정을 관리합니다. (관리자 전용)')
    .addSubcommand((sub) => sub.setName('보기').setDescription('현재 서버 설정을 확인합니다.'))
    .addSubcommand((sub) =>
      sub
        .setName('로그채널')
        .setDescription('로그를 기록할 채널을 설정합니다.')
        .addChannelOption((o) =>
          o.setName('채널').setDescription('로그 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('환영채널')
        .setDescription('환영 메시지를 보낼 채널을 설정합니다.')
        .addChannelOption((o) =>
          o.setName('채널').setDescription('환영 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('퇴장채널')
        .setDescription('퇴장 로그를 보낼 채널을 설정합니다.')
        .addChannelOption((o) =>
          o.setName('채널').setDescription('퇴장 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('자동역할')
        .setDescription('새 멤버에게 자동으로 지급할 역할을 설정합니다.')
        .addRoleOption((o) => o.setName('역할').setDescription('자동 지급 역할').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('링크필터')
        .setDescription('링크 필터를 켜거나 끕니다.')
        .addBooleanOption((o) => o.setName('활성화').setDescription('true: 켜기, false: 끄기').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('금칙어추가')
        .setDescription('금칙어를 추가합니다.')
        .addStringOption((o) => o.setName('단어').setDescription('추가할 금칙어').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('금칙어제거')
        .setDescription('금칙어를 제거합니다.')
        .addStringOption((o) => o.setName('단어').setDescription('제거할 금칙어').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('금칙어필터')
        .setDescription('금칙어 필터를 켜거나 끕니다.')
        .addBooleanOption((o) => o.setName('활성화').setDescription('true: 켜기, false: 끄기').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('스팸방지')
        .setDescription('스팸 방지 기준을 설정합니다.')
        .addIntegerOption((o) => o.setName('제한횟수').setDescription('창 시간 내 허용 메시지 수').setRequired(true).setMinValue(2))
        .addIntegerOption((o) => o.setName('창시간초').setDescription('감지 창 시간(초)').setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName('타임아웃분').setDescription('스팸 감지 시 타임아웃(분), 0이면 미적용').setRequired(true).setMinValue(0)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('릴레이추가')
        .setDescription('메시지 릴레이 쌍을 추가합니다.')
        .addChannelOption((o) =>
          o.setName('원본채널').setDescription('릴레이할 원본 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        )
        .addChannelOption((o) =>
          o.setName('대상채널').setDescription('릴레이될 대상 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('릴레이제거')
        .setDescription('메시지 릴레이 쌍을 제거합니다.')
        .addChannelOption((o) =>
          o.setName('원본채널').setDescription('제거할 릴레이의 원본 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('티켓카테고리')
        .setDescription('티켓 채널이 생성될 카테고리를 설정합니다.')
        .addChannelOption((o) =>
          o.setName('카테고리').setDescription('티켓 카테고리').setRequired(true).addChannelTypes(ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('티켓로그채널')
        .setDescription('티켓 생성/닫기 기록을 남길 채널을 설정합니다.')
        .addChannelOption((o) =>
          o.setName('채널').setDescription('티켓로그 채널').setRequired(true).addChannelTypes(ChannelType.GuildText),
        ),
    ),

  async execute(interaction) {
    if (await blockIfNoPermission(interaction, [PermissionFlagsBits.ManageGuild])) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    switch (sub) {
      case '보기': {
        const settings = getGuildSettings(guildId);
        const lines = [
          `**로그 채널:** ${settings.logChannelId ? `<#${settings.logChannelId}>` : '미설정'}`,
          `**환영 채널:** ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : '미설정'}`,
          `**퇴장 채널:** ${settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : '미설정'}`,
          `**자동 역할:** ${settings.autoRoleId ? `<@&${settings.autoRoleId}>` : '미설정'}`,
          `**링크 필터:** ${settings.linkFilterEnabled ? '켜짐' : '꺼짐'} (허용 도메인: ${settings.linkFilterAllowedDomains.join(', ') || '없음'})`,
          `**금칙어 필터:** ${settings.badWordFilterEnabled ? '켜짐' : '꺼짐'} (등록된 금칙어 ${settings.badWords.length}개)`,
          `**스팸 방지:** ${settings.spamWindow / 1000}초 내 ${settings.spamLimit}회 초과 시 타임아웃 ${settings.timeoutDuration / 60000}분`,
          `**릴레이 쌍:** ${
            settings.relayPairs.length > 0
              ? settings.relayPairs.map((p) => `<#${p.sourceChannelId}> → <#${p.targetChannelId}>`).join(', ')
              : '없음'
          }`,
          `**티켓 카테고리:** ${settings.ticketCategoryId ? `<#${settings.ticketCategoryId}>` : '미설정'}`,
          `**티켓로그 채널:** ${settings.ticketLogChannelId ? `<#${settings.ticketLogChannelId}>` : '미설정'}`,
        ];
        await interaction.reply({ content: lines.join('\n'), ephemeral: true });
        break;
      }

      case '로그채널': {
        const channel = interaction.options.getChannel('채널');
        updateGuildSettings(guildId, { logChannelId: channel.id });
        await interaction.reply(`✅ 로그 채널을 ${channel}로 설정했습니다.`);
        break;
      }

      case '환영채널': {
        const channel = interaction.options.getChannel('채널');
        updateGuildSettings(guildId, { welcomeChannelId: channel.id });
        await interaction.reply(`✅ 환영 채널을 ${channel}로 설정했습니다.`);
        break;
      }

      case '퇴장채널': {
        const channel = interaction.options.getChannel('채널');
        updateGuildSettings(guildId, { leaveChannelId: channel.id });
        await interaction.reply(`✅ 퇴장 채널을 ${channel}로 설정했습니다.`);
        break;
      }

      case '자동역할': {
        const role = interaction.options.getRole('역할');
        updateGuildSettings(guildId, { autoRoleId: role.id });
        await interaction.reply(`✅ 자동 지급 역할을 ${role}로 설정했습니다.`);
        break;
      }

      case '링크필터': {
        const enabled = interaction.options.getBoolean('활성화');
        updateGuildSettings(guildId, { linkFilterEnabled: enabled });
        await interaction.reply(`✅ 링크 필터를 ${enabled ? '켰습니다' : '껐습니다'}.`);
        break;
      }

      case '금칙어추가': {
        const word = interaction.options.getString('단어').trim();
        if (word.length === 0) {
          await interaction.reply({ content: '유효한 단어를 입력해주세요.', ephemeral: true });
          return;
        }
        const settings = getGuildSettings(guildId);
        if (settings.badWords.includes(word)) {
          await interaction.reply({ content: '이미 등록된 금칙어입니다.', ephemeral: true });
          return;
        }
        const updated = [...settings.badWords, word];
        updateGuildSettings(guildId, { badWords: updated });
        await interaction.reply({ content: `✅ 금칙어를 추가했습니다. (현재 ${updated.length}개)`, ephemeral: true });
        break;
      }

      case '금칙어제거': {
        const word = interaction.options.getString('단어').trim();
        const settings = getGuildSettings(guildId);
        const updated = settings.badWords.filter((w) => w !== word);
        updateGuildSettings(guildId, { badWords: updated });
        await interaction.reply({ content: `✅ 금칙어를 제거했습니다. (현재 ${updated.length}개)`, ephemeral: true });
        break;
      }

      case '금칙어필터': {
        const enabled = interaction.options.getBoolean('활성화');
        updateGuildSettings(guildId, { badWordFilterEnabled: enabled });
        await interaction.reply(`✅ 금칙어 필터를 ${enabled ? '켰습니다' : '껐습니다'}.`);
        break;
      }

      case '스팸방지': {
        const limit = interaction.options.getInteger('제한횟수');
        const windowSec = interaction.options.getInteger('창시간초');
        const timeoutMin = interaction.options.getInteger('타임아웃분');

        updateGuildSettings(guildId, {
          spamLimit: limit,
          spamWindow: windowSec * 1000,
          timeoutDuration: timeoutMin * 60000,
        });
        await interaction.reply(
          `✅ 스팸 방지 기준을 ${windowSec}초 내 ${limit}회, 타임아웃 ${timeoutMin}분으로 설정했습니다.`,
        );
        break;
      }

      case '릴레이추가': {
        const source = interaction.options.getChannel('원본채널');
        const target = interaction.options.getChannel('대상채널');

        if (source.id === target.id) {
          await interaction.reply({ content: '원본 채널과 대상 채널은 서로 달라야 합니다.', ephemeral: true });
          return;
        }

        const settings = getGuildSettings(guildId);
        const exists = settings.relayPairs.some((p) => p.sourceChannelId === source.id && p.targetChannelId === target.id);
        if (exists) {
          await interaction.reply({ content: '이미 등록된 릴레이 쌍입니다.', ephemeral: true });
          return;
        }

        const updated = [...settings.relayPairs, { sourceChannelId: source.id, targetChannelId: target.id }];
        updateGuildSettings(guildId, { relayPairs: updated });
        await interaction.reply(`✅ 릴레이를 추가했습니다: ${source} → ${target}`);
        break;
      }

      case '릴레이제거': {
        const source = interaction.options.getChannel('원본채널');
        const settings = getGuildSettings(guildId);
        const updated = settings.relayPairs.filter((p) => p.sourceChannelId !== source.id);

        if (updated.length === settings.relayPairs.length) {
          await interaction.reply({ content: '해당 원본 채널로 등록된 릴레이가 없습니다.', ephemeral: true });
          return;
        }

        updateGuildSettings(guildId, { relayPairs: updated });
        await interaction.reply(`✅ ${source}에서 시작되는 릴레이를 모두 제거했습니다.`);
        break;
      }

      case '티켓카테고리': {
        const category = interaction.options.getChannel('카테고리');
        updateGuildSettings(guildId, { ticketCategoryId: category.id });
        await interaction.reply(`✅ 티켓 카테고리를 ${category.name}로 설정했습니다.`);
        break;
      }

      case '티켓로그채널': {
        const channel = interaction.options.getChannel('채널');
        updateGuildSettings(guildId, { ticketLogChannelId: channel.id });
        await interaction.reply(`✅ 티켓로그 채널을 ${channel}로 설정했습니다.`);
        break;
      }

      default: {
        await interaction.reply({ content: '알 수 없는 하위 명령어입니다.', ephemeral: true });
      }
    }

    logger.command(`/설정 ${sub} 실행 - ${interaction.user.tag}`);
  },
};
