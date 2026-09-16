// utils/adminStore.js
// 봇 전역(서버 구분 없이) 오너/관리자 권한 시스템입니다.
// - 오너: 코드에 하드코딩하지 않고, 최초 실행 시 한 번만 DB(data/admins.json)에 시드(seed)해서
//         이후에는 DB 값을 기준으로 동작합니다 (봇이 재시작되어도 유지됨).
// - 관리자: 오너가 발급한 1회용 라이선스 코드(diton_XXXXXX)를 등록해서 획득합니다.
// - 관리자 제거는 별도 오너 비밀번호(OWNER_PASSWORD 환경변수)로만 가능합니다.

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_STORE_PATH = path.join(DATA_DIR, 'admins.json');

// 최초 1회 시드용 초기 오너 목록 (이후에는 DB의 owners 배열이 기준이 됨)
const INITIAL_OWNER_IDS = [
  '1499957057363640401',
  '1230428061141569599',
  '1534379956933628086',
  '721616643079405578',
  '1063613983610904618',
];

const LICENSE_PREFIX = 'diton_';

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ADMIN_STORE_PATH)) {
    fs.writeFileSync(
      ADMIN_STORE_PATH,
      JSON.stringify({ owners: [], admins: [], pendingLicenses: {} }, null, 2),
      'utf8',
    );
  }
}

function readStore() {
  try {
    ensureFile();
    const raw = fs.readFileSync(ADMIN_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      owners: parsed.owners || [],
      admins: parsed.admins || [],
      pendingLicenses: parsed.pendingLicenses || {},
    };
  } catch (err) {
    logger.error('admins.json 읽기 실패', err);
    return { owners: [], admins: [], pendingLicenses: {} };
  }
}

function writeStore(store) {
  try {
    ensureFile();
    fs.writeFileSync(ADMIN_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (err) {
    logger.error('admins.json 저장 실패', err);
    return false;
  }
}

/**
 * 봇 시작 시 1회 호출: DB에 오너 목록이 비어 있으면 초기 오너 목록으로 채웁니다.
 * 이미 DB에 오너 데이터가 있으면 건드리지 않습니다 (DB가 항상 우선).
 */
function seedOwners() {
  const store = readStore();
  if (store.owners.length === 0) {
    store.owners = [...INITIAL_OWNER_IDS];
    writeStore(store);
    logger.log(`오너 ${store.owners.length}명을 초기 시드했습니다.`);
  }
}

function isOwner(userId) {
  const store = readStore();
  return store.owners.includes(userId);
}

function isAdmin(userId) {
  const store = readStore();
  return store.owners.includes(userId) || store.admins.includes(userId);
}

function listOwners() {
  return readStore().owners;
}

function listAdmins() {
  return readStore().admins;
}

function generateLicenseCode() {
  const randomDigits = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${LICENSE_PREFIX}${randomDigits}`;
}

/**
 * 오너가 라이선스 코드를 발급합니다. 코드 중복 시 재생성해서 고유성을 보장합니다.
 */
function issueLicense(issuerUserId) {
  const store = readStore();

  let code = generateLicenseCode();
  let attempts = 0;
  while (store.pendingLicenses[code] && attempts < 20) {
    code = generateLicenseCode();
    attempts += 1;
  }

  store.pendingLicenses[code] = { issuedBy: issuerUserId, issuedAt: Date.now() };
  writeStore(store);
  return code;
}

/**
 * 라이선스 코드를 등록해서 관리자가 됩니다. 1회용이며 사용 후 즉시 폐기됩니다.
 */
function redeemLicense(code, userId) {
  if (typeof code !== 'string' || !/^diton_\d{6}$/.test(code)) {
    return { success: false, reason: 'INVALID_FORMAT' };
  }

  const store = readStore();

  if (store.owners.includes(userId) || store.admins.includes(userId)) {
    return { success: false, reason: 'ALREADY_ADMIN' };
  }

  if (!store.pendingLicenses[code]) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  delete store.pendingLicenses[code];
  store.admins.push(userId);
  writeStore(store);

  return { success: true };
}

/**
 * 오너 비밀번호(OWNER_PASSWORD 환경변수)가 맞을 때만 관리자를 제거합니다.
 * 오너는 이 명령어로 제거할 수 없습니다.
 */
function removeAdmin(userId, providedPassword) {
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerPassword) {
    return { success: false, reason: 'PASSWORD_NOT_CONFIGURED' };
  }
  if (providedPassword !== ownerPassword) {
    return { success: false, reason: 'WRONG_PASSWORD' };
  }

  const store = readStore();

  if (store.owners.includes(userId)) {
    return { success: false, reason: 'CANNOT_REMOVE_OWNER' };
  }
  if (!store.admins.includes(userId)) {
    return { success: false, reason: 'NOT_ADMIN' };
  }

  store.admins = store.admins.filter((id) => id !== userId);
  writeStore(store);

  return { success: true };
}

module.exports = {
  seedOwners,
  isOwner,
  isAdmin,
  listOwners,
  listAdmins,
  issueLicense,
  redeemLicense,
  removeAdmin,
};
