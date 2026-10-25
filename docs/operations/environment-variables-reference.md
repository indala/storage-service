# Master Environment Variables & Configuration Reference

This document provides a comprehensive audit of all environment variables used by both the **Frontend (`IJITEST`)** and the **Backend (`storage-service`)**.

---

## 1. Frontend (`IJITEST/.env`)

| Variable Name | Required | Default / Value | Description & Security Notes |
| :--- | :---: | :--- | :--- |
| **`APP_URL` / `NEXT_PUBLIC_APP_URL`** | Yes | `https://ijitest.org` (or `http://localhost:3000`) | Base URL for SEO, canonical links, and social cards. |
| **`NEXTAUTH_URL`** | Yes | `http://localhost:3000` | Canonical NextAuth URL. Must match active deployment domain. |
| **`NEXTAUTH_SECRET`** | **CRITICAL** | `super_secret_key` | Secret used to encrypt NextAuth session cookies. In production, generate with `openssl rand -base64 32`. |
| **`JWT_SECRET`** | **CRITICAL** | `super_secret_key` | Secret used for internal JWT tokens and review invitation links. |
| **`DB_HOST`** | Yes | `srv604.hstgr.io` | Hostinger MariaDB server host. |
| **`DB_PORT`** | Yes | `3306` | Database port. |
| **`DB_USER`** | Yes | `u116573049_ijitest` | Database username. |
| **`DB_PASSWORD`** | Yes | `Ijitest123` | Database password. |
| **`DB_NAME`** | Yes | `u116573049_ijitest_db` | Database schema name. |
| **`STORAGE_SERVICE_URL`** | Yes | `http://localhost:4000` | Fastify backend URL for uploads and PDF generation. |
| **`STORAGE_SERVICE_SECRET`** | **CRITICAL** | `ijitest-storage-secret-2026` | Shared secret key for communication between frontend and backend. Must match backend `.env`. |
| **`SMTP_HOST`** | Yes | `smtp.hostinger.com` | Mail server host for notification emails. |
| **`SMTP_PORT`** | Yes | `465` (SSL) | Mail server port. |
| **`SMTP_USER`** | Yes | `editor@ijitest.org` | Primary editorial email username. |
| **`SMTP_PASS`** | Yes | `[SECURED]` | Email account password. |
| **`EMAIL_FROM`** | Yes | `editor@ijitest.org` | Sender address shown in email headers. |
| **`CROSSREF_USERNAME`** | Yes | `razh1977@gmail.com/bbpj` | Crossref login ID with member role suffix. |
| **`CROSSREF_ROLE`** | Yes | `bbpj` | Crossref account role. |
| **`CROSSREF_PASSWORD`** | Yes | `Asaph2018Felix` | Crossref account password. |
| **`CROSSREF_PREFIX`** | Yes | `10.68139` | Assigned official DOI prefix. |
| **`CROSSREF_TEST_MODE`** | Yes | `'true'` or `'false'` | Toggle between staging (`test.crossref.org`) and live (`doi.crossref.org`). |
| **`ZENODO_ACCESS_TOKEN`** | Yes | `[TOKEN]` | Zenodo Personal Access Token for automated deposit API. |
| **`ZENODO_API_URL`** | Yes | `https://zenodo.org/api` | Zenodo API base URL. |
| **`ZENODO_USE_SANDBOX`** | Yes | `'true'` or `'false'` | If true, routes deposits to Zenodo Sandbox. |
| **`INDEXNOW_KEY`** | Yes | `e4a2d8b5c90146f3a8b27c6ef198305d` | API key for instant search engine indexing. |
| **`CRON_SECRET`** | Yes | `ijitest-cron-2026-secure` | Bearer token to protect scheduled background cron tasks. |

---

## 2. Backend (`storage-service/.env`)

| Variable Name | Required | Default / Value | Description |
| :--- | :---: | :--- | :--- |
| **`PORT`** | Yes | `4000` | HTTP port on which the NestJS / Fastify server listens. |
| **`STORAGE_DIR`** | Yes | `./storage` | Directory where uploaded manuscripts and PDFs are stored. |
| **`STORAGE_SERVICE_SECRET`** | **CRITICAL** | `ijitest-storage-secret-2026` | Bearer token validated by `ApiKeyGuard`. Must match frontend `.env`. |
| **`ASSETS_DIR`** | Yes | `./assets` | Directory containing journal logos, seal images, and fonts. |
| **`FRONTEND_URL`** | Yes | `http://localhost:3000` | Frontend origin allowed for CORS. |
| **`ILOVEPDF_PUBLIC_KEY`** | Optional | `[KEY]` | iLovePDF project public key for cloud PDF conversion. |
| **`ILOVEPDF_SECRET_KEY`** | Optional | `[KEY]` | iLovePDF secret key. |
