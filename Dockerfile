FROM node:24-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 python-is-python3 make g++ pkg-config \
        libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev 

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["node", "index.js"]