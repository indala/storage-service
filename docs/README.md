# IJITEST Backend Documentation & Publication Master Knowledge Base

Welcome to the **IJITEST Publication & Documentation Registry**. This directory serves as the centralized, authoritative record for all scholarly metadata, DOI assignments, ISSN registrations, indexing standards, and operational runbooks for the **International Journal of Innovative Trends in Engineering, Science and Technology (IJITEST)**.

---

## 📂 Documentation Directory Structure

```
storage-service/docs/
├── README.md                                     # Master Index & System Reference Map (This file)
├── doi-database-registry.json                    # Structured JSON database of all 20 papers & DOIs
├── doi-database-registry.md                      # Complete human-readable master DOI ledger table
│
├── crossref/                                     # Official Crossref Specifications
│   ├── official-crossref-api-spec.md             # Official HTTPS POST servlet API specs (cURL/Node/Python)
│   ├── official-crossref-schema-5.3.1.md         # Official Schema 5.3.1 XSD specifications & ROR affiliations
│   ├── crossref-system-guide.md                  # Role bbpj, credentials, and deployment guide
│   └── crossref-support-correspondence.md        # Official ticket #652389 from Danilo Kuljanin
│
├── doi-system/                                   # International DOI Foundation (IDF) & Handle System
│   └── official-doi-handle-specifications.md     # ISO 26324, syntax architecture, landing page rules
│
├── zenodo/                                       # CERN / Zenodo Self-Archiving & DataCite DOIs
│   ├── official-zenodo-rest-api-spec.md          # Official Zenodo REST API specs & bucket upload workflow
│   └── zenodo-self-archiving-guide.md            # Community URL, 3-step API, 9 verified live DOIs
│
├── issn-journal/                                 # Journal Identity, ISSN & Governance
│   ├── official-issn-iso3297-guidelines.md       # Official ISO 3297 ISSN rules & online serials display standards
│   └── issn-registration-details.md              # ISSN 3139-6887, Felix Academic Publications, EIC
│
├── indexing-standards/                           # Global Indexing Roadmaps & Protocols
│   ├── indexing-roadmap-and-checklist.md         # Google Scholar, OAI-PMH, SUSHI/COUNTER, JATS XML
│   └── doaj-application-dossier.md               # Complete pre-filled application dossier for DOAJ
│
└── operations/                                   # Future-Proof Operational SOPs & Runbooks
    ├── issue-publication-sop.md                  # Step-by-step SOP for publishing future journal issues
    ├── crossref-disaster-recovery-and-queries.md # Bulk URL updates, checking logs, handling retractions
    ├── environment-variables-reference.md        # Master .env reference for frontend & backend
    └── ojs-3.5-vs-ijitest-comparison.md          # Architectural comparison: OJS 3.5.0-5 vs IJITEST
```

---

## ⚡ Quick Reference Cards

### 1. Crossref Primary DOI System
* **Publisher:** Felix Academic Publications
* **Prefix:** `10.68139`
* **Role:** `bbpj`
* **Login ID:** `razh1977@gmail.com/bbpj`
* **Test Endpoint:** `https://test.crossref.org/servlet/deposit`
* **Production Endpoint:** `https://doi.crossref.org/servlet/deposit`
* **Status:** Verified Active (HTTP 200 SUCCESS)
* **Official API Docs:** [crossref/official-crossref-api-spec.md](crossref/official-crossref-api-spec.md)
* **Official Schema 5.3.1 Docs:** [crossref/official-crossref-schema-5.3.1.md](crossref/official-crossref-schema-5.3.1.md)
* **Disaster Recovery & URL Updates:** [operations/crossref-disaster-recovery-and-queries.md](operations/crossref-disaster-recovery-and-queries.md)

### 2. International DOI Foundation (IDF) & Handle Architecture
* **Standard:** ISO 26324
* **Resolution Mechanism:** Global Handle System Proxy (`doi.org`) $\rightarrow$ Canonical URL $\rightarrow$ 308 Archive Page
* **Official Spec:** [doi-system/official-doi-handle-specifications.md](doi-system/official-doi-handle-specifications.md)

### 3. Zenodo Secondary Self-Archiving System
* **Community:** [https://zenodo.org/communities/ijitest](https://zenodo.org/communities/ijitest)
* **Prefix:** `10.5281`
* **License:** Creative Commons Attribution 4.0 International (CC-BY 4.0)
* **Live Registered DOIs:** 9 articles from Volume 1, Issue 1 (see [zenodo/zenodo-self-archiving-guide.md](zenodo/zenodo-self-archiving-guide.md))
* **Official API Docs:** [zenodo/official-zenodo-rest-api-spec.md](zenodo/official-zenodo-rest-api-spec.md)

### 4. ISSN & Journal Identity
* **Journal Title:** International Journal of Innovative Trends in Engineering, Science and Technology (IJITEST)
* **ISSN:** `3139-6887`
* **Standard:** ISO 3297 (CIEPS Paris)
* **Editor-in-Chief:** Dr. Ravi Babu T (`editor@ijitest.org` / `razh1977@gmail.com`)
* **Portal URL:** [https://ijitest.org](https://ijitest.org)
* **Official Guidelines:** [issn-journal/official-issn-iso3297-guidelines.md](issn-journal/official-issn-iso3297-guidelines.md)

### 5. Publishing Future Issues & SOPs
* **Standard Operating Procedure:** [operations/issue-publication-sop.md](operations/issue-publication-sop.md)
* **DOAJ Submission Guide:** [indexing-standards/doaj-application-dossier.md](indexing-standards/doaj-application-dossier.md)
* **Server Configurations:** [operations/environment-variables-reference.md](operations/environment-variables-reference.md)
