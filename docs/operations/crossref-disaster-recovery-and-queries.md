# Crossref Operations, Disaster Recovery & Troubleshooting Manual

**Audience:** Journal Systems Administrator & Chief Technical Editor  
**DOI Prefix:** `10.68139`  
**Role:** `bbpj`  
**Contact:** `editor@ijitest.org` / `razh1977@gmail.com`

---

## 1. Checking Deposit Status & Submission Logs

Crossref processes metadata asynchronously after returning `HTTP 200 SUCCESS`. To verify whether DOIs have successfully completed indexing:

### Method A: Web Administration Portal
1. Navigate to: [https://doi.crossref.org](https://doi.crossref.org) (or [https://test.crossref.org](https://test.crossref.org) for staging).
2. Log in using:
   * **Username:** `razh1977@gmail.com/bbpj`
   * **Password:** `Asaph2018Felix`
3. Click **Submissions** $\rightarrow$ **Administration**.
4. View recent batch IDs (e.g. `cr-1761400000000-IJITEST-2026-001`).
5. **Status Flags:**
   * `completed`: XML parsed and DOIs successfully registered.
   * `failed`: Malformed XML or validation violation. Click the submission file to read the exact error line.

### Method B: Automated HTTP Log Query
You can download the submission log directly via HTTP GET:
```bash
curl -u "razh1977@gmail.com/bbpj:Asaph2018Felix" \
     "https://doi.crossref.org/servlet/submissionDownload?usr=razh1977@gmail.com/bbpj&pwd=Asaph2018Felix&file_name=YOUR_BATCH_ID.xml&type=result"
```

---

## 2. Disaster Recovery: Updating Paper URLs (Bulk URL Update)

If the journal ever migrates domains (e.g., from `ijitest.org` to a new primary domain or server):

**RULE:** Never delete or change the DOI string. You only update the `<resource>` target URL.

### How to Update All DOIs at Once
1. Prepare a simple tab-delimited text file or CSV containing:
   ```text
   Hdr
   10.68139/ijitest.2026.01.001   https://newdomain.org/article/ijitest-2026-001
   10.68139/ijitest.2026.01.002   https://newdomain.org/article/ijitest-2026-002
   ```
2. Log in to [doi.crossref.org](https://doi.crossref.org).
3. Navigate to **Upload Submissions** $\rightarrow$ select submission type **URL Update**.
4. Upload the file. Crossref will re-point all live DOIs to the new domain within 10 minutes worldwide with zero downtime.

---

## 3. Retractions, Corrigenda & Crossmark Policy Updates

Under COPE and Crossref standards, retracted articles must remain permanently accessible with an immutable public notice:

### A. Formal Retraction Deposit
In the Crossref XML, update the `<journal_article>` element:
```xml
<journal_article publication_type="full_text">
  <!-- Crossmark status update -->
  <crossmark>
    <crossmark_policy>10.68139/crossmark-policy</crossmark_policy>
    <crossmark_domain_exclusive>true</crossmark_domain_exclusive>
    <updates>
      <update type="retraction" date="2026-10-25">10.68139/ijitest.2026.01.007</update>
    </updates>
  </crossmark>
  ...
</journal_article>
```
* The retraction notice will automatically render in the reader's **CrossMark dialog** and on all metadata indexing engines.

---

## 4. Troubleshooting Common Crossref Errors

| Error Code / Message | Root Cause | Solution |
| :--- | :--- | :--- |
| **`HTTP 401 Unauthorized`** | Missing `/role` in username or wrong password. | Use `razh1977@gmail.com/bbpj` instead of plain email. |
| **`HTTP 400 Only POST multipart requests supported`** | Request sent as `application/x-www-form-urlencoded`. | Send as `multipart/form-data` with `operation=doMDUpload`. |
| **`Record not found (prefix mismatch)`** | Depositing a DOI prefix other than `10.68139`. | Check DOI string matches assigned member prefix. |
| **`cvc-complex-type.2.4.a: Invalid content was found`** | XML tags in wrong sequence or missing required element. | Crossref schema enforces strict order: `<titles>`, `<contributors>`, `<publication_date>`, `<pages>`, `<doi_data>`. |
| **`Duplicate DOI in batch`** | Same DOI appears twice in one XML file. | Ensure each `<doi>` in the batch is unique. |
