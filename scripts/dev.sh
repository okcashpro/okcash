echo "Passing arguments: $*"
npx concurrently --raw \
  "pnpm --dir packages/core dev -- $*" \
  "pnpm --dir packages/client-telegram dev -- $*" \
  "pnpm --dir packages/client-discord dev -- $*" \
  "pnpm --dir packages/client-twitter dev -- $*" \
  "pnpm --dir packages/client-direct dev -- $*" \
  "pnpm --dir packages/plugin-bootstrap dev -- $*" \
  "pnpm --dir packages/plugin-node dev -- $*" \
  "pnpm --dir packages/adapter-sqlite dev -- $*" \
  "pnpm --dir packages/adapter-postgres dev -- $*" \
  "node -e \"setTimeout(() => process.exit(0), 5000)\" && pnpm --dir packages/agent dev -- $*"
