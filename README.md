# Intake24-tasks

CRON-like node.js service to interact with Intake24 API and Clinical DB

## 1. Install dependencies

    npm install

## 2. Set up configuration file

Copy `.env.example` to `.env` file and set up configuration variables

    cp .env.example .env

## 3. Start node.js application

### 3.1 Development enviroment

    npm run dev

Starts daemon with hot-reloading

### 3.2 Production enviroment

#### 3.2.1 Build node.js application

    npm run prod

#### 3.2.2 Launch node.js application

    npm run serve

Install as service (service example `intake24-tasks.service`) or use node.js process manager
