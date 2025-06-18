# Rota Backend

This project provides the backend API for the event application. Start the server with

```
npm start
```

## Scheduled cleanup

Old events are automatically removed by a cron job defined in `jobs/deleteOldEvents.js`.
The cron runs every night at 00:01 **as long as the application process is running**.
At startup the cleanup job is also executed once immediately.

ss