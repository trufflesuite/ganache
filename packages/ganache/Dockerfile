# use full node to install dependencies
FROM node:20.3.0@sha256:600cac71919fc686481c9c1d652c493c630ceeb13d207f9ae8c0a7bb9fde4a71 AS builder

WORKDIR /app

COPY . .

# clean and install dependencies
RUN npm run clean
RUN npm ci --unsafe-perm

# import INFURA_KEY environment variable (build-arg)
ARG INFURA_KEY

# build application
RUN npm run build

# prune development dependencies
RUN npx lerna exec --scope ganache -- npm prune --production

# we use node "slim" instead of "alpine" until we create a uwebsockets build for alpine.
FROM node:20.3.0-slim@sha256:68fa53d981a628c2ce9d8e1d9f587b4dba2ff412f2f32a1fa11cb332a897af14

WORKDIR /app

# copy from build image
COPY --from=builder /app/packages/ganache/node_modules node_modules
# TODO(perf): we don't need everything in here. Maybe either create a separate
# build for docker or cherry-pick the files we actually need.
COPY --from=builder /app/packages/ganache/dist/node dist/node

ENV DOCKER true
ENV NODE_ENV production

EXPOSE 8545

# set the entrypoint
ENTRYPOINT ["node", "/app/dist/node/cli.js"]
