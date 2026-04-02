FROM node:20-slim AS builder

WORKDIR /app

# Install only shared + monitor dependencies
COPY packages/shared/package.json packages/shared/
COPY packages/monitor/package.json packages/monitor/

RUN cd packages/shared && npm install && \
    cd ../monitor && npm install

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
COPY --from=builder /app/packages/monitor/node_modules packages/monitor/node_modules
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules

USER node
CMD ["node", "packages/monitor/dist/index.js"]
