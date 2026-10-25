# Official Zenodo REST API Specifications & Deposit Protocol

**Service Provider:** CERN (European Organization for Nuclear Research) & OpenAIRE  
**Base URLs:**
* **Production:** `https://zenodo.org/api/`
* **Sandbox / Staging:** `https://sandbox.zenodo.org/api/`  
**Authentication:** Personal Access Token via HTTP header `Authorization: Bearer <TOKEN>`  
**Official Reference:** [Zenodo REST API Developers Documentation](https://developers.zenodo.org/)

---

## 1. Complete Deposition Lifecycle (4-Step Workflow)

```
Step 1: Create Draft       Step 2: Stream PDF to Bucket      Step 3: Update Metadata       Step 4: Publish
 POST /deposit/depositions     PUT <bucket_url>/<filename>     PUT /deposit/depositions/:id  POST .../actions/publish
 ─────────────────────────►    ────────────────────────────►  ────────────────────────────► ────────────────────────►
 Receives deposition_id        Uploads binary PDF stream      Adds creators, CC-BY, DOI     Mints 10.5281 DOI
 & links.bucket URL            directly to storage bucket     and journal metadata          and indexes in OpenAIRE
```

---

## 2. API Endpoints & Request Payloads

### Step 1: Create an Empty Draft Deposition
* **Endpoint:** `POST /api/deposit/depositions`
* **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **Payload:** `{}`
* **Response Excerpt:**
  ```json
  {
    "id": 22847060,
    "links": {
      "bucket": "https://zenodo.org/api/files/5a4d1b82-9c12-4f32-8432-892182910291",
      "publish": "https://zenodo.org/api/deposit/depositions/22847060/actions/publish"
    }
  }
  ```

---

### Step 2: Upload Files via the Bucket URL
Uploading directly to the `bucket` URL via `PUT` handles large PDF files efficiently without multipart overhead:

* **Endpoint:** `PUT <bucket_url>/<filename.pdf>`
* **Headers:**
  * `Authorization: Bearer <TOKEN>`
  * `Content-Type: application/octet-stream` (or `application/pdf`)
* **Body:** Raw binary stream of the published galley PDF.

---

### Step 3: Populate & Update Metadata
* **Endpoint:** `PUT /api/deposit/depositions/:id`
* **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **JSON Payload:**
  ```json
  {
    "metadata": {
      "title": "Fabrication of Multipurpose Agriculture Machine",
      "upload_type": "publication",
      "publication_type": "article",
      "description": "Agriculture plays a vital role in economic development...",
      "publication_date": "2026-01-15",
      "access_right": "open",
      "license": "cc-by-4.0",
      "keywords": [
        "Agriculture Machine",
        "Solar Power",
        "Multipurpose",
        "Renewable Energy"
      ],
      "creators": [
        {
          "name": "Jagan Mohan, S. Sai Durga",
          "affiliation": "Miracle Educational Society Group of Institutions"
        },
        {
          "name": "Dinesh, P."
        }
      ],
      "journal_title": "International Journal of Innovative Trends in Engineering, Science and Technology",
      "journal_volume": "1",
      "journal_issue": "1",
      "communities": [
        { "identifier": "ijitest" }
      ],
      "related_identifiers": [
        {
          "identifier": "https://doi.org/10.68139/ijitest.2026.01.007",
          "relation": "isIdenticalTo",
          "scheme": "doi"
        }
      ]
    }
  }
  ```

---

### Step 4: Publish the Deposition
* **Endpoint:** `POST /api/deposit/depositions/:id/actions/publish`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Status Code:** `202 Accepted`
* **Result:** Deposition becomes immutable, registered on DataCite, and accessible under DOI `10.5281/zenodo.:id`.

---

## 3. Deposition Action Matrix

| Action | HTTP Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Publish** | `POST` | `/api/deposit/depositions/:id/actions/publish` | Publishes draft and mints live DataCite DOI. |
| **Edit** | `POST` | `/api/deposit/depositions/:id/actions/edit` | Unlocks a published record for metadata revisions. |
| **Discard** | `POST` | `/api/deposit/depositions/:id/actions/discard` | Reverts all draft changes on an unlocked record. |
| **New Version** | `POST` | `/api/deposit/depositions/:id/actions/newversion` | Creates a new draft version linked to the concept DOI. |
