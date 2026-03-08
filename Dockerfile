FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN yarn build

FROM base AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-dejavu-core \
    fonts-noto-core \
    fonts-open-sans \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=build /app /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

RUN mkdir -p /app/data /app/logs \
    && chown -R node:node /app

USER node

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["yarn", "start"]
