RDS Setup (PostgreSQL)
======================

This project keeps SQLite as the default. RDS is opt-in and uses a separate Prisma schema file.

Overview
--------
- Default (no change): SQLite with `server/prisma/schema.prisma`
- RDS (PostgreSQL): use `server/prisma-postgres/schema.prisma` + `DATABASE_URL` pointing to RDS

Important
---------
- SQLite is **not impacted** unless you change `DATABASE_URL` and run the RDS scripts below.
- Prisma client must be generated using the Postgres schema when you switch to RDS.
- Postgres migrations are stored separately under `server/prisma-postgres/migrations`.

1) Configure env
----------------
Set `DATABASE_URL` to your RDS Postgres connection string:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
```

2) Generate Prisma client (RDS)
-------------------------------
From `server/`:

```
npm run prisma:generate:rds
```

3) Validate schema against RDS
------------------------------
```
npm run db:validate:rds
```

4) Apply migrations to RDS
--------------------------
If this is the first time you are using RDS, create an initial migration:

```
npx prisma migrate dev --schema=./prisma-postgres/schema.prisma --name init_rds --create-only
```

Use deploy to apply existing migrations:

```
npm run db:migrate:rds
```

5) Seed demo data on RDS (optional)
-----------------------------------
This uses the existing seed script after generating the RDS Prisma client:

```
npm run db:seed:rds
```

6) Start the server
-------------------
Start as usual. The server will use `DATABASE_URL` (now RDS):

```
npm run start
```

Notes
-----
- If you are moving existing SQLite data to RDS, export and import data separately.
- Keep your SQLite `.env` untouched for local development.
