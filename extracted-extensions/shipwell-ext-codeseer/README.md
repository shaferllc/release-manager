# CodeSeer

PHP debugging extension for Shipwell/Release Manager. Receive dumps, traces, and logs from your PHP app via TCP.

## Features

- **Real-time debugging** – See PHP dumps as they happen
- **TCP server** – Listens on port 23523 (configurable) for NDJSON payloads
- **Multiple payload types** – Dumps, traces, logs, tables, markdown, etc.
- **Clickable stack traces** – Open files in your editor

## Setup

1. Install the [CodeSeer PHP library](https://github.com/tomshafer/codeseer) in your PHP project
2. Configure it to send to `127.0.0.1:23523`
3. Open the CodeSeer tab in a project's detail view
4. Run your PHP app and use `cs('hello')` to send output

## Build

```bash
npm install
npm run build
```

Produces `dist/index.js` which is loaded by the desktop app.
