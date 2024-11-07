echo "Passing arguments: $*"
npx concurrently --raw \
  "pnpm --dir packages/core dev -- $*" \
  "node -e \"setTimeout(() => process.exit(0), 5000)\" && pnpm --dir packages/agent dev -- $*"