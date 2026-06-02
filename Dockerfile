FROM node:22-alpine AS builder
WORKDIR /app

# WebRTC TURN（ビルド時に埋め込み・任意）
ARG VITE_SERVER_URL
ARG VITE_TURN_URL
ARG VITE_TURN_USERNAME
ARG VITE_TURN_CREDENTIAL
ENV VITE_SERVER_URL=$VITE_SERVER_URL \
    VITE_TURN_URL=$VITE_TURN_URL \
    VITE_TURN_USERNAME=$VITE_TURN_USERNAME \
    VITE_TURN_CREDENTIAL=$VITE_TURN_CREDENTIAL

COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/

RUN npm install --prefix client && npm install --prefix server

COPY client client
COPY server server

RUN npm run build --prefix client && npm run build --prefix server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV ENABLE_DEMO_BOTS=false

COPY package.json ./
COPY server/package.json server/
RUN npm install --prefix server --omit=dev

COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/client/dist client/dist

EXPOSE 3001
ENV PORT=3001

CMD ["node", "server/dist/index.js"]
