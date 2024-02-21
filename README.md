<p align="center">
    <a href="https://nodejs.org/en/about/releases">
        <img src="https://img.shields.io/badge/node-%3E%3D%2016-success" alt="node compatibility">
    </a>
    <a href='https://github.com/MRC-Epid-it24/tasks/actions' target="__blank">
        <img alt="Build Status" src='https://github.com/MRC-Epid-it24/tasks/workflows/CI/badge.svg'>
    </a>
    <a href="https://github.com/MRC-Epid-it24/tasks/blob/master/LICENSE" target="__blank">
        <img alt="License" src="https://img.shields.io/github/license/MRC-Epid-it24/tasks">
    </a>
</p>
<br/>

# Intake24-tasks

Interface between Intake24 API and Clinical DB

- CRON-like node.js service
- CLI to execute tasks directly

## Requirements

Make sure you have Node.js (16+) and npm (7+) installed.

MSSQL lib requires ODBC driver headers to be installed:

```sh
apt install unixodbc-dev
```

Install pnpm

```sh
pnpm install -g pnpm
```

## Installation

Download local project dependencies

```sh
pnpm install
```

Copy `.env-template` to `.env` file.

```sh
cp .env-template .env
```

Edit `.env` file and set up main configuration variables.

Any additional configuration variables (not extracted as ENV variables) can be found in `src/config` folder.

## Tasks setup

Service executes specific tasks based on provided CRON entry and additional task-specific variables.

Task entries for execution are defined in `tasks.json` file as an array of simple JSON objects.

Copy `tasks-template.json` to `tasks.json` file

```sh
cp tasks-template.json tasks.json
```

Edit `tasks.json` file and set up task definitions as needed.

## Task definitions

Currently implemented tasks are:

### EXPORT_SURVEY_DATA

- Export Intake24 survey data and imports data into external database (MSSQL engine)

```json
{
    "name": "EXPORT_SURVEY_DATA",
    "cron": "* * * * *",
    "params": {
        "apiVersion": "v3" | "v4",
        "survey": "demo",
        "exportOffset": 7,
        "exportVersion": "v2"
    },
    "db": {
        "database": "databaseName",
        "tables": {
            "data": "importDataTable",
            "log": "importLogTable"
        }
    },
    "notify": {
        "success": [],
        "error": []
    }
},
```

### EXPORT_SURVEY_SETTINGS

- Export Intake24 survey stats

```json
{
    "name": "EXPORT_SURVEY_SETTINGS",
    "cron": "* * * * *",
    "params": {},
    "notify": {
        "success": [],
        "error": []
    }
},
```

### IMPORT_JSON_SUBMISSIONS

- read contents of folder with files contains intake24 submission in JSON format
- output either to `csv` or `database`

```json
{
    "name": "IMPORT_JSON_SUBMISSIONS",
    "cron": false,
    "params": {
        "localeId": "en_GB",
        "dir": "/path/to/submission/files",
        "output": "csv" | "database"
    },
    "db": {
        "database": "databaseName",
        "tables": {
            "data": "importDataTable",
            "log": "importLogTable"
        }
    },
    "notify": {
      "success": [],
      "error": []
    }
},
```

### DB_DUMP_TO_LOCAL

- Run pg_dump for `system` or `foods` database and transfer to local / network location.
- Make sure you got pg_dump binaries installed, e.g. for ubuntu: `apt-get install postgresql-client`.

```json
{
    "name": "DB_DUMP_TO_LOCAL",
    "cron": "* * * * *",
    "params": {
        "instance": "instance-name",
        "dialect": "mariadb" | "mysql" | "postgres",
        "database": string | string[],
        "basePath": "/destination/path",
        "appendPath"?: "hourly",
        "maxAge"?: "30d"
    },
    "notify": {
        "success": [],
        "error": []
    }
}
```

### DB_DUMP_TO_SFTP

- Run pg_dump for `system` or `foods` database and upload to sftp.
- Make sure you got pg_dump binaries installed, e.g. for ubuntu: `apt-get install postgresql-client`.

```json
{
    "name": "DB_DUMP_TO_SFTP",
    "cron": "* * * * *",
    "params": {
        "instance": "instance-name",
        "dialect": "mariadb" | "mysql" | "postgres",
        "database": string | string[],
        "maxAge"?: "30d",
        "sftp": {
            "host": "sftp-server.example.com",
            "port": 22,
            "username": "sftp-username",
            "password": "sftp-password",
            "dir": "remote/dir/path"
        }
    },
    "notify": {
        "success": [],
        "error": []
    }
}
```

### UPLOAD_DISPLAY_NAMES

- First (display) name synchronization from external database (MSSQL) into Intake24 instance

```json
{
    "name": "UPLOAD_DISPLAY_NAMES",
    "cron": "* * * * *",
    "params": {
        "survey": "demo"
    },
    "db": {
        "database": "databaseName"
    },
    "notify": {
        "success": [],
        "error": []
    }
},
```

### UPLOAD_PAQ_LINKS

- Upload external questionnaire URLs from external database (MSSQL) into the Intake24

```json
{
  "name": "UPLOAD_PAQ_LINKS",
  "cron": "* * * * *",
  "params": {
    "survey": "demo"
  },
  "db": {
    "database": "databaseName"
  },
  "notify": {
    "success": [],
    "error": []
  }
}
```

## Build

### Development environment

Start server with hot-reloading

```sh
pnpm dev
```

### Production environment

Build application

```sh
pnpm build
```

Launch application

```sh
pnpm start
```

Optional

- install as service (systemd service example - `intake24-tasks.service`)
- use node.js process manager like `pm2`

## CLI

### Execute task (by index)

- Execute specific task in `tasks.json` based on index.

```sh
pnpm cli --task-index <index>
```

- Execute specific task without build.

```sh
pnpm cli:dev --task-index <index>
```

## Deployment

Ansible role is provided as part of [intake24 deployment repository](https://github.com/MRC-Epid-it24/deployment)
