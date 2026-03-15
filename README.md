# zhongwen

A starter for creating a Vite+ monorepo.

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run test -r
```

- Build the monorepo:

```bash
vp run build -r
```

- Run the development server:

```bash
vp run dev
```

## Local Infra

Start MinIO from the repo root:

```bash
docker compose up -d
```

This compose file provisions:

- `minio` S3-compatible storage on `localhost:9000`
- MinIO Console on `localhost:9001` (login: `minioadmin` / `minioadmin`)

After starting, create a bucket via the console at http://localhost:9001 or with the MinIO client:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/zhongwen
```

Then configure `apps/zhongwen/.env` with:

```env
NUXT_S3_ENDPOINT=http://localhost:9000
NUXT_S3_ACCESS_KEY=minioadmin
NUXT_S3_SECRET_KEY=minioadmin
NUXT_S3_BUCKET=zhongwen
```
