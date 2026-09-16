# Discord Relay Bot

메시지 릴레이 기능을 기본으로, 관리/모더레이션, 티켓, 활동 추적·랭킹, 오너/관리자 라이선스 시스템, 이벤트 공지까지 포함한 discord.js v14 기반 Discord 봇입니다.

## 1. 기능 목록

### 기본 (관리/모더레이션 30개)
1. 자동 상태 메시지 순환 (재연결 시 중복 타이머 방지)
2. `/ping` `/botinfo` `/serverinfo` `/userinfo` `/avatar` `/servericon` `/invite` `/help` `/stats`
3. `/announce` - 관리자 공지
4. 자동 환영 메시지 / 퇴장 로그 / 입장·퇴장·닉네임·역할 변경 로그
5. 메시지 삭제/수정 로그
6. 자동 역할 지급
7. `/kick` `/ban` `/unban` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings`
8. 자동 스팸 방지, 링크 필터, 금칙어 필터
9. 재연결 감지/로그, 프로세스 예외 처리(unhandledRejection/uncaughtException)
10. `/설정` - 서버별 관리자 설정 시스템

### 메시지 릴레이
`.env`의 `RELAY_SOURCE_CHANNEL_ID`/`RELAY_TARGET_CHANNEL_ID` 또는 `/설정 릴레이추가`로 채널 쌍을 등록하면, 원본 채널 메시지가 Webhook을 통해 대상 채널로 릴레이됩니다.

### 티켓 시스템
- `!티켓버튼` (ManageGuild 권한) - 현재 채널에 "🎫 티켓 생성" 버튼 패널을 게시합니다.
- 버튼을 누르면 `/설정 티켓카테고리`로 지정한 카테고리 아래에 비공개 채널이 생성되고, 개설자에게 DM으로 링크가 전송되며, `/설정 티켓로그채널`에 생성 기록이 남습니다.
- 티켓 채널의 "🔒 티켓 닫기" 버튼은 개설자 본인, `ManageChannels` 권한 보유자, 또는 봇 관리자/오너만 누를 수 있습니다. 누르면 5초 후 채널이 삭제되고 티켓로그에 기록됩니다.
- 사용자당 동시에 열린 티켓은 1개로 제한됩니다.

### 활동 추적 / 랭킹
- 메시지 전송, 음성채널 접속 시간을 서버별·사용자별로 자동 집계합니다.
- `!음성` / `!채팅` - 본인의 활동(음성 누적 시간 또는 메시지 수)과 유저 ID를 확인합니다.
- `!음성랭킹` / `!채팅랭킹` - 서버 활동 랭킹 1~15위를 정확한 누적 시간(또는 메시지 수)과 마지막 활동 시각(몇시 몇분, KST)과 함께 보여줍니다.
- `/활동확인 [user]` - 슬래시 명령어 버전.
- **매일 자정(00:00, KST) 자동 초기화**됩니다. (재연결 시 타이머 중복 생성 방지 처리됨)
- `!활동초기화` / `/활동초기화` - ManageGuild 권한 보유자 또는 봇 관리자/오너가 즉시 수동 초기화할 수 있습니다. 이 시점에 음성채널에 접속 중인 사용자의 "진행 중인 활동"도 함께 초기화됩니다.

### 오너 / 관리자 라이선스 시스템 (봇 전역, 서버 구분 없음)
- **오너**: 아래 5개 ID가 최초 실행 시 1회 DB(`data/admins.json`)에 자동으로 시드되어, 봇이 재시작돼도 유지됩니다. 이후에는 DB 값이 기준이 됩니다.
  ```
  1499957057363640401
  1230428061141569599
  1534379956933628086
  721616643079405578
  1063613983610904618
  ```
- `!오너` - 오너 목록 조회 / `!관리자` - 관리자 목록 조회
- `!라이센스생성` (오너 전용) - `diton_XXXXXX` 형식의 1회용 라이선스 코드를 발급해서 **오너 본인 DM**으로 전송합니다. (DM이 막혀 있으면 채널에 임시로 안내 후 10초 뒤 자동 삭제)
- `!관리자등록 diton_XXXXXX` - 발급받은 코드를 등록해서 관리자가 됩니다. (1회용, 등록 즉시 폐기)
- `!관리자제거 @유저 오너비밀번호` - `OWNER_PASSWORD` 환경변수와 일치하는 비밀번호를 입력해야 제거됩니다. 오너는 이 명령어로 제거할 수 없습니다. 비밀번호 노출을 줄이기 위해 명령어 사용 직후 원본 메시지와 결과 안내를 자동 삭제합니다.
- **관리자(오너 제외)가 사용할 수 있는 기능은 다음 5가지로 제한됩니다**: `/warn`(경고), `/clearwarnings`(경고 삭제), 티켓 닫기, `!관리자패널`, 활동 초기화. 그 외 관리 명령어(`/kick`, `/ban` 등)는 여전히 실제 Discord 서버 권한이 있어야 사용할 수 있습니다.
- `!관리자패널` - 관리자/오너 전용. 사용 가능한 기능 안내와 함께, "🔄 활동 초기화" 버튼을 눌러 바로 초기화할 수 있습니다.

  ⚠️ **보안 참고**: `OWNER_PASSWORD`는 채팅으로 직접 입력하는 방식이라 구조적으로 완전히 안전하지는 않습니다. 반드시 `.env`나 Railway Variables에만 설정하고 코드에 직접 적지 마세요. 가능하면 봇과의 DM에서 `!관리자제거`를 사용하고, 비밀번호를 주기적으로 교체하는 것을 권장합니다.

### 이벤트 공지 (메시지 + 사진)
- `/이벤트` - 채널, 제목, 내용, 사진(첨부파일), 전체멘션 여부를 지정해서 이벤트 공지를 보냅니다. (ManageGuild 권한)
- `!이벤트 #채널 제목/내용` - 메시지에 사진을 첨부하면 함께 게시됩니다.

### 니트로(외부) 이모지
봇 메시지/임베드에 다른 서버의 커스텀 이모지(`<:name:id>`, 애니메이션 `<a:name:id>`)를 그대로 넣어 전송할 수 있습니다. `/invite`로 생성되는 초대 링크에 `Use External Emojis`/`Use External Stickers` 권한이 포함되어 있어 리액션 등에도 사용할 수 있습니다.

## 2. 파일 구조

```
relay-bot/
├── index.js                  # 메인 진입 파일
├── deploy-commands.js        # 슬래시 명령어 등록 스크립트
├── package.json / .env.example / .gitignore
├── commands/                 # 슬래시 명령어
├── commands-prefix/          # 접두사(!) 명령어
├── events/                   # 이벤트 핸들러
├── utils/                    # 로거, 권한, DB, 릴레이, 필터, 활동, 티켓, 관리자 로직
└── data/                     # JSON 저장소 (guildSettings, warnings, activity, tickets, admins)
```

## 3. 설치

```bash
npm install
```

## 4. Discord Developer Portal 설정

1. https://discord.com/developers/applications 에서 애플리케이션 생성
2. **Bot** 탭에서 Privileged Gateway Intents **모두 켜기**
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
   - PRESENCE INTENT
3. 토큰 발급 → `DISCORD_TOKEN`
4. **General Information**의 Application ID → `CLIENT_ID`
5. 봇에 `Manage Channels`, `Manage Webhooks`, `Manage Roles`, `Moderate Members` 등 초대 시 권한 부여 (자동 생성되는 `/invite` 링크 사용 권장)

## 5. 환경변수

`.env.example` 참고. 특히 새로 추가된 항목:
- `PREFIX` (기본 `!`)
- `OWNER_PASSWORD` - `!관리자제거`용 비밀번호 (반드시 직접 설정, 코드에 적지 말 것)
- `TICKET_CATEGORY_ID` / `TICKET_LOG_CHANNEL_ID` - 없어도 `/설정` 명령어로 실행 중 설정 가능

## 6. Slash Command 등록

```bash
node deploy-commands.js
```

## 7. 배포 (Railway 기준)

1. GitHub 푸시 → Railway 프로젝트 생성
2. Variables 탭에 `.env.example` 항목 등록 (`DISCORD_TOKEN`, `CLIENT_ID`, `OWNER_PASSWORD` 필수)
3. 배포 후 Shell에서 `node deploy-commands.js` 1회 실행
4. Start Command: `npm start`

## 8. 테스트 체크리스트

- `/ping`, `/설정 보기`로 기본 동작 확인
- `/설정 티켓카테고리`, `/설정 티켓로그채널` 설정 후 `!티켓버튼`으로 패널 게시 → 버튼으로 티켓 생성/닫기 확인
- 음성채널 입장 후 `!음성`으로 시간이 올라가는지 확인, `!음성랭킹`으로 랭킹 확인
- 메시지를 몇 개 보낸 뒤 `!채팅`, `!채팅랭킹` 확인
- `!오너`로 초기 오너 5명이 뜨는지 확인
- 오너 계정으로 `!라이센스생성` → DM으로 받은 코드로 다른 계정에서 `!관리자등록 diton_XXXXXX` → `!관리자` 목록에 뜨는지 확인
- `!관리자제거 @유저 <OWNER_PASSWORD 값>`으로 제거되는지, 틀린 비밀번호로는 실패하는지 확인
- `/이벤트` 또는 `!이벤트 #채널 제목/내용` (사진 첨부)로 공지 확인

## 9. 발생 가능한 오류와 해결 방법

| 오류 | 원인 | 해결 방법 |
|---|---|---|
| `Used disallowed intents` | Privileged Intent 미활성화 | Bot 탭에서 SERVER MEMBERS / MESSAGE CONTENT / PRESENCE 켜기 |
| 슬래시 명령어가 안 보임 | 미등록 / 전역 반영 대기 중 | `node deploy-commands.js`, `GUILD_ID` 설정 시 즉시 반영 |
| 티켓 채널이 생성되지 않음 | 티켓 카테고리 미설정 또는 봇 권한 부족 | `/설정 티켓카테고리` 확인, 봇에 `Manage Channels` 권한 부여 |
| 음성 활동이 기록되지 않음 | `GuildVoiceStates` 인텐트 누락 | index.js의 intents 설정 확인 (이미 포함됨), 봇 재배포 |
| `!관리자제거` 실패 | `OWNER_PASSWORD` 미설정 또는 오타 | Railway Variables에 정확히 설정했는지 확인 |
| 라이선스 등록이 안 됨 | 코드 형식 오류 또는 이미 사용된 코드 | `diton_` + 숫자 6자리 형식 확인, 코드는 1회용 |
| 로그인 실패 | `DISCORD_TOKEN` 오류 | 토큰 재발급 후 갱신 |

## 10. 최종 점검 결과

- ✅ 이벤트 중복 등록: 파일당 1회만 등록
- ✅ 상태 순환 / 활동 초기화 타이머 중복 방지: `client.__statusIntervalStarted`, `client.__activityResetScheduled` 플래그로 재연결 시에도 재생성 안 됨
- ✅ 권한 우회 가능성: 관리 명령어는 Discord 권한 또는 봇 관리자/오너 여부를 서버 측에서 재검증. `!관리자제거`는 비밀번호 불일치·오너 보호 로직 포함
- ✅ 민감정보: `OWNER_PASSWORD`, `DISCORD_TOKEN` 모두 코드에 하드코딩하지 않고 환경변수로만 관리. 라이선스 코드는 DM 우선 전송, 채널 노출 시 자동 삭제
- ✅ 문법 오류: 모든 파일 `node -c` 통과, 핵심 로직(활동 집계, 라이선스 발급/등록/제거) 직접 실행 테스트 통과
