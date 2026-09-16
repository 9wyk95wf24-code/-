// utils/permissions.js
// 명령어별 최소 권한 검사를 담당합니다.

const { PermissionFlagsBits } = require('discord.js');

const NO_PERMISSION_MESSAGE = '이 명령어를 사용할 권한이 없습니다.';

/**
 * interaction.member 가 지정된 권한들을 모두 가지고 있는지 확인합니다.
 * @param {import('discord.js').GuildMember} member
 * @param {bigint[]} requiredPermissions
 * @returns {boolean}
 */
function hasPermission(member, requiredPermissions = []) {
  if (!member) return false;
  return requiredPermissions.every((perm) => member.permissions.has(perm));
}

/**
 * 권한이 없으면 인터랙션에 친절한 안내 메시지를 보내고 true(차단됨)를 반환합니다.
 * 권한이 있으면 false를 반환합니다.
 */
async function blockIfNoPermission(interaction, requiredPermissions = []) {
  if (!hasPermission(interaction.member, requiredPermissions)) {
    await interaction.reply({ content: NO_PERMISSION_MESSAGE, ephemeral: true });
    return true;
  }
  return false;
}

module.exports = {
  PermissionFlagsBits,
  hasPermission,
  blockIfNoPermission,
  NO_PERMISSION_MESSAGE,
};
