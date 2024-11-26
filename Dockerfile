FROM node:23.1.0
# Install pnpm globally
RUN npm install -g pnpm@9.4.0

# Set the working directory
WORKDIR /app

# Add configuration files and install dependencies
ADD pnpm-workspace.yaml /app/pnpm-workspace.yaml
ADD package.json /app/package.json
ADD .npmrc /app/.npmrc
ADD tsconfig.json /app/tsconfig.json
ADD pnpm-lock.yaml /app/pnpm-lock.yaml
RUN pnpm i

# Add the documentation
ADD docs /app/docs
RUN pnpm i

# Add the rest of the application code
ADD packages /app/packages
RUN pnpm i

# Add agent
ADD agent /app/agent
RUN pnpm i

# Add the scripts and characters
ADD scripts /app/scripts
ADD characters /app/characters

# Build the project
RUN pnpm build

EXPOSE 3000

ENV PORT=3000

# Command to run the container
CMD ["tail", "-f", "/dev/null"]
