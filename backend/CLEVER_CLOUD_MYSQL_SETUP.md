# Clever Cloud MySQL Setup Guide

This guide explains how to point the HRIS backend to the section-wide Clever Cloud MySQL database instead of the local Docker instance.

---

## 1. Provision the Database on Clever Cloud

1. Sign in to [Clever Cloud](https://www.clever-cloud.com/).
2. Create a new **MySQL** add-on (choose the free tier for demo use).
3. After provisioning, open the add-on and note the connection details under **Information**:
   - Host
   - Port
   - Database name
   - User
   - Password
   - (Optional) SSH tunnel info if you prefer secure tunneling
4. Enable automated backups if you upgrade to a paid tier later—free tier only keeps limited snapshots.

---

## 2. Update Environment Variables

The backend reads database credentials from `.env`. Replace the Docker defaults with the Clever Cloud values:

```bash
# backend/.env
DB_HOST=<clever-cloud-host>
DB_PORT=<clever-cloud-port>
DB_NAME=<clever-cloud-database>
DB_USER=<clever-cloud-user>
DB_PASSWORD=<clever-cloud-password>
```

Additional variables to double-check:

```bash
NODE_ENV=production            # or development
PORT=5000                      # backend server port
JWT_SECRET=<existing-secret>
TOKEN_EXPIRATION=1d
```

> **Tip:** never commit the `.env` file—keep it local or use Clever Cloud’s configuration variables feature if you deploy the backend there as well.

---

## 3. Point Local Services to Clever Cloud (Demo Mode)

If you run the backend via `npm run dev` or Docker Compose:

1. **Disable the local MySQL container** for demo sessions by commenting out or removing the `mysql` service in `docker-compose.yml`, or simply avoid running `docker compose up mysql`.
2. Ensure `DATABASE_URL` or the individual `DB_*` variables are exported in your shell (or stored in `.env`) before starting the backend.
3. Start the backend:
   ```bash
   # from backend/
   npm install           # first time only
   npm run dev           # uses Clever Cloud database via env vars
   ```

---

## 4. (Optional) Keep Local MySQL for Offline Development

You can keep the Docker MySQL service for offline work:

1. Duplicate `.env` into `.env.local` (ignored) with Docker creds (e.g., `DB_HOST=localhost`, `DB_USER=root`).
2. Switch between configurations by copying the relevant file into `.env` when needed.

---

## 5. Import Seed Data to Clever Cloud

To load the existing seed scripts from `/init` into Clever Cloud:

1. Download the credentials (`USER`, `PASSWORD`, `HOST`, `PORT`, `DATABASE`).
2. Install the MySQL CLI locally (or use Clever Cloud’s web console).
3. Run the seed scripts in order:

   ```bash
   mysql -h <host> -P <port> -u <user> -p <database> < ../init/01_create_tables.sql
   mysql -h <host> -P <port> -u <user> -p <database> < ../init/02_insert_data.sql
   mysql -h <host> -P <port> -u <user> -p <database> < ../init/03_user_management.sql
   ```

4. Confirm that the tables and sample data exist (e.g., via the Clever Cloud database dashboard or a tool like MySQL Workbench).

> **Heads-up:** the Clever Cloud free tier stores only 10 MB. Keep demo usage light (no heavy logging) and truncate tables after practice sessions if needed.

---

## 6. Rotate Credentials Securely

- Regenerate the database password if it was previously shared publicly.
- Update `.env` and any other services (frontend, other subsystems) that connect to the database.
- Communicate changes to teammates via a secure channel (never commit to Git).

---

## 7. Troubleshooting

| Symptom | Possible Cause | Fix |
| --- | --- | --- |
| `ER_ACCESS_DENIED_ERROR` | Wrong username/password | Re-copy credentials from Clever Cloud dashboard. |
| `ENOTFOUND` host errors | Local DNS cannot resolve Clever Cloud host | Use the IP address provided or ensure you’re connected to the internet. |
| Requests timeout after a while | Free tier sleeps on long inactivity | Ping the DB (e.g., simple query) before demos; service will resume within seconds. |
| Server logs still show `localhost` | Forgot to reload `.env` | Restart the backend after editing environment variables. |

---

## 8. Next Steps (Optional)

1. Store shared credentials in a password manager for the whole section.
2. Set up a staging Clever Cloud add-on if you need separate datasets for testing.
3. Consider upgrading when storage/traffic surpass free limits or you need automatic backups.

---

Need help wiring the frontend or other subsystems to Clever Cloud? Reach out and we can document those steps too.
