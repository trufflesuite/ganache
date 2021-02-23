FROM node:14.15.5 AS builder

WORKDIR /app

COPY . .

# clean and install dependencies
RUN npm run clean
RUN npm ci --unsafe-perm

# build application
RUN npm run --prefix=src/packages/ganache build

# prune development dependencies
RUN npm prune --production

FROM node:14.15.5-slim

WORKDIR /app

# copy from build image
COPY --from=builder /app/src/packages/ganache .

ENV DOCKER true

EXPOSE 8545

# set the entrypoint
ENTRYPOINT ["node", "/app/dist/cli/ganache.min.js"]
