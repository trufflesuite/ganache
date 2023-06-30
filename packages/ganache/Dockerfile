# use full node to install dependencies
FROM node:14.17.4@sha256:cd98882c1093f758d09cf6821dc8f96b241073b38e8ed294ca1f9e484743858f AS builder

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
FROM node:14.17.4-slim@sha256:766e2dcf4461582f7f750656807edbc28019753cecae92b1f2b25d13d3401ef3

WORKDIR /app

# copy from build image
COPY --from=builder /app/src/packages/ganache/node_modules node_modules
# TODO(perf): we don't need everything in here. Maybe either create a separate
# build for docker or cherry-pick the files we actually need.
COPY --from=builder /app/src/packages/ganache/dist/node dist/node

ENV DOCKER true
ENV NODE_ENV production

EXPOSE 8545

# set the entrypoint
ENTRYPOINT ["node", "/app/dist/node/cli.js"]
