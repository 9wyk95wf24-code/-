// events/interactionCreate.js
// 슬래시 명령어와 버튼 인터랙션을 라우팅합니다.
// 명령어 실행 중 오류가 발생해도 봇 전체는 계속 실행됩니다.

const logger = require('../utils/logger');
const { createTicket, closeTicket } = require('../utils/tickets');
const { isAdmin } = require('../utils/adminStore');
const { resetActivity } = require('../utils/activityTracker');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    if (interaction.isButton()) {
      try {
        if (interaction.customId === 'ticket_create_button') {
          await createTicket(interaction);
        } else if (interaction.customId === 'ticket_close_button') {
          await closeTicket(interaction);
        } else if (interaction.customId === 'admin_panel_reset_activity') {
          if (!isAdmin(interaction.user.id)) {
            await interaction.reply({ content: '이 버튼은 관리자 또는 오너만 사용할 수 있습니다.', ephemeral: true });
          } else {
            resetActivity(interaction.guild.id);
            await interaction.reply({ content: '✅ 이 서버의 활동 기록을 초기화했습니다.', ephemeral: true });
          }
        }
      } catch (err) {
        logger.error(`버튼(${interaction.customId}) 처리 중 오류`, err);
        const errorMessage = { content: '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', ephemeral: true };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else {
            await interaction.reply(errorMessage);
          }
        } catch (replyErr) {
          logger.error('버튼 오류 응답 실패', replyErr);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`등록되지 않은 명령어 호출됨: /${interaction.commandName}`);
      return;
    }

    try {
      logger.command(`/${interaction.commandName} 실행 - ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (err) {
      logger.error(`/${interaction.commandName} 실행 중 오류`, err);

      const errorMessage = { content: '명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyErr) {
        logger.error('오류 메시지 응답 실패', replyErr);
      }
    }
  },
};
