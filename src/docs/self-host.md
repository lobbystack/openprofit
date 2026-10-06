---
navLabel: Self-Hosting
contentType: How-to
description: Run OpenProfit on your own server with one Docker container, sign in, connect your own Postgres, and update to new versions.
---

# Run OpenProfit on your own server

This page shows you how to run OpenProfit in one Docker container and sign in for the first time. It also covers using your own Postgres database and updating. You need Docker.

## Start the container

The image stores its data in an embedded Postgres database on a Docker volume, so it needs no other service. Before you start it, generate a secret: OpenProfit uses it to encrypt the provider keys you paste in and to sign sessions.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The command prints 32 random bytes encoded as base64. Pass that value as `SECRET_KEY` when you run the image:

```bash
docker run -d \
  --name openprofit \
  -p 3000:3000 \
  -v openprofit_data:/app/data \
  -e SECRET_KEY=your_secret_here \
  -e APP_URL=http://localhost:3000 \
  ghcr.io/lobbystack/openprofit:latest
```

The `-v` flag keeps your data in the `openprofit_data` volume when the container is replaced. Set `APP_URL` to the address people use to reach the instance, because sign-in links point there.

Keep the secret somewhere safe. If you lose it, OpenProfit can’t decrypt the stored provider keys and you’ll have to reconnect every provider.

## Sign in for the first time

OpenProfit signs you in with a link sent by email. Open `http://localhost:3000/login`, enter your email address and click **Email me a link**.

Without an email provider, the instance writes the link to its log instead of sending it. Print the log and open the link in the same browser:

```bash
docker logs openprofit
```

To send links and the weekly email by mail, set `RESEND_API_KEY` and `EMAIL_FROM` and restart the container. The [environment variables reference](/docs/environment) lists every option, including sign-in with GitHub or Google.

## Use your own Postgres database

If you already run Postgres, point OpenProfit at it and the embedded database isn’t used. Set `DATABASE_URL` to a connection string that starts with `postgres://`:

```bash
-e DATABASE_URL=postgres://your_user:your_password@your_host:5432/openprofit
```

OpenProfit creates and updates its tables on start, so the database only needs to exist.

## Update to a new version

Updating replaces the container and keeps the volume, so your data stays. Pull the new image and remove the old container:

```bash
docker pull ghcr.io/lobbystack/openprofit:latest
docker rm -f openprofit
```

Then run the `docker run` command from [Start the container](#start-the-container) again. Schema changes apply when the new container starts.

## Deploy on Railway

The hosted version at openprofit.dev runs this same image on Railway. To do the same:

1. Create a service from the image `ghcr.io/lobbystack/openprofit:latest`.
2. Add a Postgres database to the project.
3. Set `DATABASE_URL` to the database’s connection string, and set `SECRET_KEY` and `APP_URL` as described above.
