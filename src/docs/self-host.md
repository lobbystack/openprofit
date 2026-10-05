# Self-host

One container. Data lives in an embedded Postgres on a volume. You need Docker and a 32-byte secret that encrypts provider keys.

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run the image:

```bash
docker run -d \
  --name openprofit \
  -p 3000:3000 \
  -v openprofit_data:/app/data \
  -e SECRET_KEY=your_secret_here \
  -e APP_URL=http://localhost:3000 \
  ghcr.io/lobbystack/openprofit:latest
```

Open `http://localhost:3000/login` and enter your email. Without an email provider the sign-in link prints in the container log:

```bash
docker logs openprofit
```

Set `RESEND_API_KEY` and `EMAIL_FROM` to send links and the weekly email by mail.

## Your own Postgres

Point `DATABASE_URL` at a `postgres://` URL and the embedded database is not used. The schema is applied on start.

## Updating

Pull the new image and recreate the container. The volume keeps your data; schema changes apply on start.

```bash
docker pull ghcr.io/lobbystack/openprofit:latest
docker rm -f openprofit
```

Then run the `docker run` command again.

## Railway

The hosted version runs this same image on Railway with a Railway Postgres. Create a service from the image, add a Postgres database, set `DATABASE_URL` to the database's URL and `SECRET_KEY` and `APP_URL` as above.
