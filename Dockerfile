FROM mhart/alpine-node:7.9.0

RUN apk add --no-cache make gcc g++ python git bash
COPY package.json /src/package.json
WORKDIR /src
RUN npm install

ADD . .

EXPOSE 8545

ENTRYPOINT ["node", "./bin/testrpc"]
