# Standard Operating Procedure (SOP): Publishing a New Journal Issue

**Target Audience:** Managing Editors, Production Editors, Technical Staff  
**Journal:** International Journal of Innovative Trends in Engineering, Science and Technology (IJITEST)  
**Applies To:** Volume / Issue releases (e.g., Volume 1 Issue 2, Volume 2 Issue 1)

---

## 📋 Pre-Publication Checklist

Before an issue can be scheduled or made live:

1. **Editorial Decision & Galley Proofs:**
   * Every manuscript must have status `'accepted'`.
   * Production PDF must be generated with IJITEST header, footer, ISSN (`3139-6887`), and page numbers.
   * Galley proof must be approved by the corresponding author.
   * Signed Copyright Agreement must be uploaded and verified in the editorial dashboard.

2. **Sequential Page Numbering:**
   * Consecutive pagination within the issue (e.g., Paper 1: pp. 1–8, Paper 2: pp. 9–17).
   * Record `startPage` and `endPage` in the issue assignment screen.

3. **DOI Assignment:**
   * Primary Crossref DOI syntax: `10.68139/ijitest.YYYY.VV.NNN` (e.g. `10.68139/ijitest.2026.01.021`).
   * Canonical URL: `https://ijitest.org/article/ijitest-YYYY-NNN`.

---

## 🚀 Step-by-Step Publication Workflow

```
[1. Create Issue] ──► [2. Assign Articles] ──► [3. Publish Issue] ──► [4. Deposit DOIs] ──► [5. Ping Indexes]
Volume/Issue #        Assign pages & DOIs      Toggle status to       Submit Crossref XML    IndexNow & Google
& Year in Admin       to accepted papers       'published' in DB      & Zenodo deposits      Scholar sitemap
```

### Step 1: Create Volume & Issue Container
1. Log in to the Admin Dashboard at `https://ijitest.org/admin/publications`.
2. Click **Create New Issue**.
3. Specify:
   * **Volume Number:** (e.g. `1`)
   * **Issue Number:** (e.g. `2`)
   * **Year:** (e.g. `2026`)
   * **Month Range:** (e.g. `February - March 2026`)
   * **Issue Cover & Description:** (Optional)

---

### Step 2: Assign Accepted Articles
1. Under **Unassigned Accepted Manuscripts**, select the papers scheduled for this issue.
2. Enter the page range (`start_page` and `end_page`).
3. Confirm the pre-generated DOI matches `10.68139/ijitest.[YEAR].[VOL].[SEQ]`.

---

### Step 3: Trigger Publication
1. In the Issue view, click **Publish Issue**.
2. This action:
   * Changes `volumes_issues.status` to `'published'`.
   * Sets `date_published` to current UTC timestamp.
   * Changes all associated submissions to status `'published'`.
   * Revalidates Next.js cache tags (`CACHE_TAGS.PUBLICATIONS`, `CACHE_TAGS.ARCHIVES`).

---

### Step 4: Crossref Metadata Deposit
1. In the Issue management panel, click **Export Crossref XML** or **Deposit to Crossref**.
2. **Review the Generated Batch:**
   * Download the XML from `/api/export/crossref/issue/[issueId]`.
   * (Optional) Validate on [crossref.org/02publishers/parser.html](https://www.crossref.org/02publishers/parser.html).
3. **Submit via Portal or Action:**
   * If using automated action: Click **Submit Live CrossRef Batch**.
   * If depositing manually:
     ```bash
     curl -F "operation=doMDUpload" \
          -F "login_id=razh1977@gmail.com/bbpj" \
          -F "login_passwd=Asaph2018Felix" \
          -F "fname=@issue-batch.xml" \
          https://doi.crossref.org/servlet/deposit
     ```
4. Verify HTTP 200 SUCCESS response.

---

### Step 5: Zenodo Secondary Self-Archiving Deposit
1. For each published article, open the article admin card.
2. Click **Deposit to Zenodo**.
3. System will automatically:
   * Reserve deposition ID.
   * Stream the published galley PDF to the Zenodo bucket.
   * Attach CC-BY 4.0 license, creators, and related Crossref DOI identifier.
   * Trigger `/actions/publish` to mint the DataCite DOI.

---

### Step 6: Search Indexing & Cache Revalidation
1. **IndexNow Ping:**
   Trigger the IndexNow webhook to notify search engines (Bing, Yandex, Naver) of newly published URLs:
   ```bash
   node indexnow-submit.js
   ```
2. **Verify Google Scholar Meta Tags:**
   Open any article page (`/archives/volumeX/issueY/PAPERID`), view page source, and confirm `citation_title` and `citation_pdf_url` are rendered in `<head>`.
