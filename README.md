# Intake24-tasks

Interface between Intake24 API and Clinical DB (CRON-like node.js service)

## Installation

Download local project dependencies

```sh
npm install
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
        "survey": "demo",
        "version": "v2"
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
npm run dev
```

### Production environment

Build application

```sh
npm run prod
```

Launch application

```sh
npm run start
```

Optional

- install as service (systemd service example - `intake24-tasks.service`)
- use node.js process manager like `pm2`

## CLI

### Execute task (by index)

- Execute specific task in `tasks.json` based on index.

```sh
npm run cli --task-index <index>
```

## Deployment

Ansible role is provided as part of [intake24 deployment repository](https://github.com/MRC-Epid-it24/deployment)
