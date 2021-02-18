FROM mhart/alpine-node:14 as builder

RUN apk add --no-cache make gcc g++ python git bash

# COPY package.json /app/package.json
# COPY npm-shrinkwrap.json /app/npm-shrinkwrap.json

# we'll have the enture repo copied in
# can we traverse up a dir to npm i?
# do we need to copy in the entire mono repo / npm i (at the root)

WORKDIR /app
RUN git config --global url.https://github.com/.insteadOf ssh://git@github.com/
COPY . .
# COPY ../../../ .
# RUN npx webpack-cli --config ./webpack/webpack.docker.config.js

RUN npm i
RUN cd src/packages/ganache && npm run build
RUN ls

FROM mhart/alpine-node:14 as runtime

WORKDIR /app

# COPY --from=builder "/app/dist/cli" "./app/cli"
# COPY --from=builder "/app/dist/node" "./app/node"

# ENV DOCKER true

# EXPOSE 8545

# ENTRYPOINT ["node", "/app/cli/ganache.min.js"]
