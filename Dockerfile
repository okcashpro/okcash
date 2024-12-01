FROM node:23.3.0
RUN npm install -g pnpm@9.4.0

# Set the working directory
WORKDIR /app

# Add configuration files and install dependencies
ADD pnpm-workspace.yaml /app/pnpm-workspace.yaml
ADD package.json /app/package.json
ADD .npmrc /app/.npmrc
ADD tsconfig.json /app/tsconfig.json
ADD turbo.json /app/turbo.json

# Add the documentation
ADD docs /app/docs

# Add the rest of the application code
ADD agent /app/agent
ADD packages /app/packages

# Add the environment variables
ADD scripts /app/scripts
ADD characters /app/characters
ADD .env /app/.env

RUN pnpm i
RUN pnpm build

# Command to run the container
CMD ["tail", "-f", "/dev/null"]