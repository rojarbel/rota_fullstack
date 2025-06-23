# Rota Backend

This project provides the backend API for the event application. Start the server with

```
npm start
```
## Configuration

Copy `.env.example` to `.env` and provide values for the following variables:

- `MONGO_URL`
- `JWT_SECRET`
- `GOOGLE_MAPS_API_KEY`

## Scheduled cleanup

Old events are automatically removed by a cron job defined in `jobs/deleteOldEvents.js`.
The cron runs every night at 00:01 **as long as the application process is running**.
At startup the cleanup job is also executed once immediately.

