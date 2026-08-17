FROM node:26-alpine

RUN npm install --global pnpm@11.21.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build
EXPOSE 4173
CMD ["pnpm", "run", "preview"]
