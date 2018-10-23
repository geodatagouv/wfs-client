# wfs-client [![CircleCI](https://circleci.com/gh/geodatagouv/wfs-client.svg?style=svg)](https://circleci.com/gh/geodatagouv/wfs-client)

> A very simple WFS client

[![npm version](https://badgen.net/npm/v/wfs-client)](https://www.npmjs.com/package/wfs-client)
[![dependencies Status](https://badgen.net/david/dep/geodatagouv/wfs-client)](https://david-dm.org/geodatagouv/wfs-client)
[![XO code style](https://badgen.net/badge/code%20style/XO/cyan)](https://github.com/xojs/xo)

## Features

* Support of versions 1.0.0, 1.1.0 and 2.0.0
* Version negociation
* Service identification in plain JavaScript / JSON
* List all feature types

## Usage

### Create a client

```js
const wfs = require('wfs-client')
const client = wfs('http://your-wfs-server.tld/wfs', options)
```

#### Options

| Option name | Type | Description | Default | Example |
| ---------- | ---------- | ----------- | ---------- | ---------- |
| version | Optional | If you want to by-pass version negociation | _undefined_ | 1.1.0 |
| userAgent | Optional | User-Agent used in requests | wfs-client/{version} (+https://github.com/geodatagouv/wfs-client) | WFSBot 1.0 |

### Get service capabilities

```js
const capabilities = await client.capabilities()

// Service identification
console.log(capabilities.service)

// Feature types
console.log(capabilities.featureTypes)
```

#### Service identification example

```js
{
  title: 'My WFS server title',
  abstract: 'This WFS server is dedicated to environment data...',
  keywords: [ 'Data', 'Water', 'Energy', 'France', 'Europa'],
  serviceType: 'WFS',
  serviceTypeVersion: '2.0.0',
  fees: 'Free',
  accessConstraints: 'None'
}
```

#### Feature types example

```js
[
  {
    name: 'orgA:wind_power_zones',
    title: 'Wind power zones',
    keywords: [
      'Wind power',
      'Energy',
      'Zoning'
    ]
  },
  {
    name: 'orgB:solar_energy_zones',
    title: 'Solar energy zones',
    keywords: [
      'Solar energy',
      'Energy',
      'Zoning'
    ]
  }
]
```

## TODO

* Read ServiceProvider (>= 1.1.0)
* Read Capability (1.0.0) and OperationsMetadata (>= 1.1.0)
* Read SRS and bounding boxes
* Support GetFeature
* Add Node-style callbacks
* Tests and more tests

## About

### License

MIT

### Author

Jérôme Desboeufs ([@jdesboeufs](https://twitter.com/jdesboeufs))
