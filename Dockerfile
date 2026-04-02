FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/monitor/package.json packages/monitor/

RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/monitor/ packages/monitor/

RUN npx tsc -p packages/shared/tsconfig.json && \
    npx tsc -p packages/monitor/tsconfig.json

FROM node:20-slim

WORKDIR /app
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/monitor/dist packages/monitor/dist
COPY --from=builder /app/packages/monitor/package.json packages/monitor/
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json ./

USER node
CMD ["node", "packages/monitor/dist/index.js"]
