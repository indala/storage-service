# Official Crossref Metadata Schema 5.3.1 Technical Specifications

**Schema Version:** 5.3.1  
**Target Namespace:** `http://www.crossref.org/schema/5.3.1`  
**Schema Location:** `http://www.crossref.org/schemas/crossref5.3.1.xsd`  
**Official Repository:** [gitlab.com/crossref/schema](https://gitlab.com/crossref/schema/-/tree/master/best-practice-examples?ref_type=heads)

---

## 1. Schema 5.3.1 Key Features & Breaking Changes

Schema 5.3.1 introduces structured **affiliation identifiers** (ROR - Research Organization Registry):

* **Prior Schemas (< 5.3.0):** Allowed affiliations only as free-text strings inside `<institution>`.
* **Schema 5.3.1:** Encapsulates affiliations inside `<affiliations><institution>` with explicit support for:
  * `<institution_name>`: Formal university or laboratory name.
  * `<institution_id type="ror">`: Persistent ROR URL (e.g. `https://ror.org/012345678`).
  * `<institution_department>` and `<institution_place>`.

---

## 2. Complete Journal Article Schema Hierarchy

```xml
<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/5.3.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1"
           xmlns:ai="http://www.crossref.org/AccessIndicators.xsd"
           version="5.3.1"
           xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
  
  <!-- 1. HEADER (Batch Tracking & Credentials) -->
  <head>
    <doi_batch_id>IJITEST_20261025181500_001</doi_batch_id>
    <timestamp>20261025181500</timestamp>
    <depositor>
      <depositor_name>Felix Academic Publications</depositor_name>
      <email_address>editor@ijitest.org</email_address>
    </depositor>
    <registrant>Felix Academic Publications</registrant>
  </head>

  <!-- 2. BODY CONTAINER -->
  <body>
    <journal>
      
      <!-- 2.1 JOURNAL-LEVEL METADATA -->
      <journal_metadata>
        <full_title>International Journal of Innovative Trends in Engineering, Science and Technology</full_title>
        <abbrev_title>IJITEST</abbrev_title>
        <issn media_type="electronic">3139-6887</issn>
      </journal_metadata>

      <!-- 2.2 ISSUE METADATA -->
      <journal_issue>
        <publication_date media_type="online">
          <month>01</month>
          <year>2026</year>
        </publication_date>
        <journal_volume>
          <volume>1</volume>
        </journal_volume>
        <issue>1</issue>
      </journal_issue>

      <!-- 2.3 ARTICLE RECORD -->
      <journal_article publication_type="full_text">
        <titles>
          <title>Fabrication of Multipurpose Agriculture Machine</title>
        </titles>

        <!-- Contributors & Authors -->
        <contributors>
          <person_name sequence="first" contributor_role="author">
            <given_name>S. Sai Durga</given_name>
            <surname>Jagan Mohan</surname>
            <affiliations>
              <institution>
                <institution_name>Miracle Educational Society Group of Institutions</institution_name>
              </institution>
            </affiliations>
          </person_name>
          <person_name sequence="additional" contributor_role="author">
            <given_name>P.</given_name>
            <surname>Dinesh</surname>
          </person_name>
        </contributors>

        <!-- Structured JATS Abstract -->
        <jats:abstract xml:lang="en">
          <jats:p>Agriculture plays a vital role in economic development...</jats:p>
        </jats:abstract>

        <!-- Publication Date -->
        <publication_date media_type="online">
          <month>01</month>
          <day>15</day>
          <year>2026</year>
        </publication_date>

        <!-- Pagination / Article Number -->
        <pages>
          <first_page>45</first_page>
          <last_page>52</last_page>
        </pages>

        <!-- Access Indicators (Open Access License) -->
        <ai:program name="AccessIndicators">
          <ai:free_to_read/>
          <ai:license_ref applies_to="vor">https://creativecommons.org/licenses/by/4.0/</ai:license_ref>
        </ai:program>

        <!-- Persistent Identifiers & Similarity Check -->
        <doi_data>
          <doi>10.68139/ijitest.2026.01.007</doi>
          <resource>https://ijitest.org/article/ijitest-2026-007</resource>
          
          <!-- iParadigms crawler allows Turnitin / Similarity Check indexing -->
          <collection property="crawler-based">
            <item crawler="iParadigms">
              <resource>https://ijitest.org/api/files/published/007.pdf</resource>
            </item>
          </collection>
        </doi_data>

      </journal_article>

    </journal>
  </body>
</doi_batch>
```

---

## 3. Mandatory vs Optional Elements Summary

| Element | Level | Requirement | Purpose |
| :--- | :--- | :---: | :--- |
| `<doi_batch_id>` | `<head>` | **Mandatory** | Unique string per submission batch. |
| `<timestamp>` | `<head>` | **Mandatory** | Integer/timestamp format `YYYYMMDDHHMMSS`. |
| `<depositor>` | `<head>` | **Mandatory** | Identifies submitting member and notification email. |
| `<full_title>` | `<journal_metadata>` | **Mandatory** | Official serial title matching ISSN registry. |
| `<issn>` | `<journal_metadata>` | **Mandatory** | With `media_type="electronic"` or `"print"`. |
| `<titles><title>` | `<journal_article>` | **Mandatory** | Primary article headline. |
| `<person_name>` | `<contributors>` | **Mandatory** | At least one author with `sequence="first"`. |
| `<publication_date>` | `<journal_article>` | **Mandatory** | Must include `<year>`. Month and day recommended. |
| `<doi>` | `<doi_data>` | **Mandatory** | Official persistent DOI matching prefix. |
| `<resource>` | `<doi_data>` | **Mandatory** | Permanent HTTP landing page URL. |
| `<jats:abstract>` | `<journal_article>` | Recommended | Full abstract formatted with JATS tags. |
| `<collection>` | `<doi_data>` | Recommended | Full-text PDF link for Turnitin similarity screening. |
