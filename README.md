# Intake24-tasks

Interface between Intake24 API and Clinical DB (CRON-like node.js service)

## 1. Installation

Download local project dependencies

    npm install

Copy `.env.example` to `.env` file

    cp .env.example .env

Edit `.env` file and set up main configuration variables

Any additional configuration variables (not extracted as ENV variables) can be found in `src/config` folder.

## 2. Tasks setup

Service executes specific tasks based on provided CRON entry and additional task-specific variables.

Task entries for execution are defined in `src/config/tasks.js` file as an array of simple JSON objects.

### 2.1. Task definition

Currently implemented tasks are:

- EXPORT_SURVEY_DATA - exports intake24 survey data and imports data into specific database

```
{
    name: 'EXPORT_SURVEY_DATA',
    cron: '* * * * *',
    params: {
      survey: 'demo',
      version: 'v2'
    }
}
```

- UPLOAD_DISPLAY_NAMES - First (display) name synchronisation into intake24

```
{
    name: 'UPLOAD_DISPLAY_NAMES',
    cron: '* * * * *',
    params: {
      survey: 'demo'
    }
}
```

## 3. Build

### 3.1. Development environment

Start a server with hot-reloading

    npm run dev

### 3.2. Production environment

Build node.js application

    npm run prod

Launch node.js application

    npm run serve

Optional

- install as service (systemd service example - `intake24-tasks.service`)
- use node.js process manager like `pm2`
