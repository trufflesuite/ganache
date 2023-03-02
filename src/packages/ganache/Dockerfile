ARG UID=2000
ARG GID=2000

ARG INFURA_KEY=00000000000000000000000000000000

# Stage: Prepare build layer ---------------------------------------------------

# use full node to install dependencies
FROM node:14.21.3-buster AS base-build

ARG UID
ARG GID

RUN addgroup --gid ${GID} ganache; \
    adduser --uid ${UID} --gid ${GID} ganache --disabled-password

# Stage: Prepare runtime layer -------------------------------------------------

FROM node:14.21.3-slim AS base-runtime

ARG UID
ARG GID

RUN addgroup --gid ${GID} ganache; \
    adduser --uid ${UID} --gid ${GID} ganache --disabled-password

# Stage: Build -----------------------------------------------------------------

FROM base-build as builder

ARG UID
ARG GID
USER ${UID}

WORKDIR /app

COPY --chown=${UID}:${GID} . .

# clean and install dependencies
RUN npm run clean
RUN npm ci --unsafe-perm

# import INFURA_KEY environment variable (build-arg)
ARG INFURA_KEY

# build application
RUN npm run build

# prune development dependencies
RUN npx lerna exec --scope ganache -- npm prune --production

# Stage: Run -------------------------------------------------------------------

FROM base-runtime as runtime

ARG UID
ARG GID
USER ${UID}

WORKDIR /app

# copy from build image
COPY --from=builder --chown=${UID}:${GID} /app/src/packages/ganache/node_modules node_modules
# TODO(perf): we don't need everything in here. Maybe either create a separate
# build for docker or cherry-pick the files we actually need.
COPY --from=builder --chown=${UID}:${GID} /app/src/packages/ganache/dist/node dist/node

ENV DOCKER true
ENV NODE_ENV production

EXPOSE 8545

# set the entrypoint
ENTRYPOINT ["node", "/app/dist/node/cli.js"]
