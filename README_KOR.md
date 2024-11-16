# Eliza

<img src="./docs/static/img/eliza_banner.jpg" alt="eliza banner" width="100%"/>

## 기능

-   🛠 SNS 지원: 디스코드, 트위터, 텔레그램 모두 지원됩니다.
-   👥 다중 지원: 다중 에이전트 및 채팅방이 지원됩니다.
-   📚 높은 유연성: 개발자가 쉽게 데이터를 추가하고, 이를 활용해 다양한 기능을 만들 수 있습니다.
-   💾 검색 지원: 당신의 데이터와 작업을 쉽게 찾아볼 수 있도록, 검색 기능을 지원합니다.
-   🚀 높은 확장성: 자신의 동작과 클라이언트를 만들어 기능을 확장할 수 있습니다.
-   ☁️ 다양한 AI 모델 지원: local Llama, OpenAI, Anthropic, Groq 등 다양한 AI 모델을 지원합니다
-   📦 즐겁게 개발해 봐요!

## eliza로 어떤걸 만들 수 있을까요?

-   🤖 챗봇 개발
-   🕵 ️AI가 자율적으로 결과를 만들어줘요!
-   📈 업무처리 자동화
-   🎮 비디오 게임 NPC

# 사용시작

**필수 요구사항:**

-   [Python 2.7+](https://www.python.org/downloads/)
-   [Node.js 23.1+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
-   [pnpm](https://pnpm.io/installation)

## .env 파일 편집

-   .env.example을 복사해서 필요한 값들을 채워넣어 .env파일을 만드세요.
-   트위터 환경변수 값을 채워, 봇의 트위터 사용자 이름과 비밀번호를 설정하세요.

## character file 편집

-   캐릭터 파일 경로: `src/core/defaultCharacter.ts ` - 캐릭터 파일을 필요에 맞게 수정하세요.
-   동시 실행 지원: `pnpm start --characters="path/to/your/character.json"` - 다음의 명령어를 사용하면, 여러 캐릭터 파일을 한번에 불러와, 다양한 봇을 동시에 실행 시킬 수 있습니다.

모두 설정하셨으면, 아래의 커맨드를 입력하여 로봇을 실행시켜주세요:

```
pnpm i
pnpm start
```

# Eliza 커스텀하기

### 커스텀 기능 추가하기

메인 디렉토리의 git 충돌을 방지하기 위해 커스텀 동작은 `custom_actions` 디렉토리에 추가하신 후, 추가하신 내용을 `elizaConfig.yaml` 파일에 작성하세요. `elizaConfig.example.yaml` 파일에 예시가 있습니다.

### AI 모델 실행 방법

### Run with Llama

`XAI_MODEL`환경 변수를`meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` 또는 `meta-llama/Meta-Llama-3.1-405B-Instruct`로 설정하여 Llama 70B 혹은 405B 모델을 실행시킬 수 있습니다.

### Run with Grok

`XAI_MODEL` 환경변수를 `grok-beta`로 설정하여 Grok 모델을 실행시킬 수 있습니다.

### Run with OpenAI

`XAI_MODEL` 환경변수를 `gpt-4o-mini` 혹은 `gpt-4o` 로 설정하여, OpenAI model을 실행시킬 수 있습니다.

## 기타 요구 사항

시작시 오류가 발견되면, 아래의 명령어로 Sharp를 설치해보세요:

```
pnpm install --include=optional sharp
```

# 환경 셋업

다양한 플랫폼에 연결하기 위해 .env 파일에 다음의 환경 변수들을 채워 넣어야 합니다:

```
# Required environment variables
DISCORD_APPLICATION_ID=
DISCORD_API_TOKEN= # Bot token
OPENAI_API_KEY=sk-* # OpenAI API key, starting with sk-
ELEVENLABS_XI_API_KEY= # API key from elevenlabs
GOOGLE_GENERATIVE_AI_API_KEY= # Gemini API key

# ELEVENLABS SETTINGS
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000

TWITTER_DRY_RUN=false
TWITTER_USERNAME= # Account username
TWITTER_PASSWORD= # Account password
TWITTER_EMAIL= # Account email
TWITTER_COOKIES= # Account cookies

X_SERVER_URL=
XAI_API_KEY=
XAI_MODEL=


# For asking Claude stuff
ANTHROPIC_API_KEY=

WALLET_PRIVATE_KEY=EXAMPLE_WALLET_PRIVATE_KEY
WALLET_PUBLIC_KEY=EXAMPLE_WALLET_PUBLIC_KEY

BIRDEYE_API_KEY=

SOL_ADDRESS=So11111111111111111111111111111111111111112
SLIPPAGE=1
RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_API_KEY=


## Telegram
TELEGRAM_BOT_TOKEN=

TOGETHER_API_KEY=
```

# 로컬 인터페이스 설정

### CUDA 셋업

고성능 NVIDIA GPU를 가지고 있는 분들은, CUDA 를 설치하시면 당신의 로컬 인터페이스를 놀랍도록 가속 시킬 수 있습니다.

```
pnpm install
npx --no node-llama-cpp source download --gpu cuda
```

설치 후에는 당신의 CUDA Toolkit에 cuDNN and cuBLAS 이 포함되었는지 다시 한번 확인하세요.

### 로컬 실행

다음 중 한가지 옵션을 선택하여 XAI_MODEL 을 추가하세요. [Run with
Llama](#run-with-llama) - X_SERVER_URL 와 XAI_API_KEY 는 비워둬도 됩니다.
이 파일을 통해 huggingface 에서 모델이 다운로드 되며, 로컬로 쿼리 됩니다.

# 클라이언트

## Discord Bot

디스코드 봇을 세팅하는 방법을 알고싶으면 아래의 링크를 통해 확인하세요:
https://discordjs.guide/preparations/setting-up-a-bot-application.html

# 개발하기

## 테스트 방법

일반 테스트에 적합한 커맨드:

```bash
pnpm test           # Run tests once
pnpm test:watch    # Run tests in watch mode
```

데이터베이스에 특화된 테스트 커맨드:

```bash
pnpm test:sqlite   # Run tests with SQLite
pnpm test:sqljs    # Run tests with SQL.js
```

테스트 결과는 Jest를 통해 작성되며, `src/**/*.test.ts` 파일에서 확인할 수 있습니다.
테스트 환경 구성단계:

-   `.env.test` 에서 환경변수가 불러와집니다.
-   테스트 타임아웃 시간은 2분으로 설정되어있습니다.
-   ESM 모듈이 지원됩니다.
-   순차적으로 테스트가 실행됩니다. (--runInBand)

새 테스트를 만들려면, 테스트 중인 코드 옆에 `.test.ts` 파일을 추가하세요.
