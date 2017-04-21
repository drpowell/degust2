# This repository is deprecated

**You should now use [https://github.com/drpowell/degust](https://github.com/drpowell/degust)**

# Degust 2


## Requirements

You need [Node.js](http://nodejs.org/download/) and
[MongoDB](http://www.mongodb.org/downloads) installed and running.

You'll need npm >= 2.x

You need R installed, and these packages: limma, edgeR

## Installation

```bash
$ git clone https://github.com/drpowell/degust2 && cd ./degust2
$ npm install
```


## Setup

First you need to setup your config file.

```bash
$ mv ./config.example.js ./config.js #set mongodb and email credentials
$ mkdir cache
```

## Running the app

```bash
$ npm start
```

The first "social login" will become the root user


## Production build & run with minified

```bash
$ grunt production --env=production
```


## Build embedding script

```bash
$ ./build-embed.sh remote
```
