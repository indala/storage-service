# Academic Journal Indexing Roadmap & Technical Checklist

This guide outlines the technical requirements, metadata feeds, and compliance standards for indexing IJITEST in major scholarly databases.

---

## 1. Indexing Target Matrix

| Indexing Body | Status | Technical Requirements | Endpoint / Feed |
| :--- | :---: | :--- | :--- |
| **Google Scholar** | 🟢 **Active** | Highwire Press meta tags (`citation_*`), crawlable PDF URLs | [/archives/...](https://ijitest.org/archives) |
| **Crossref** | 🟢 **Verified** | Schema 5.3.1 XML batch deposits, Similarity Check URL | `https://test.crossref.org/servlet/deposit` |
| **Zenodo / DataCite** | 🟢 **Active** | REST API automated deposit, CC-BY 4.0 license | `https://zenodo.org/api` |
| **DOAJ (Directory of Open Access Journals)** | 🟡 **Ready for Application** | Open access statement, CC-BY 4.0, zero embargo, DOAJ JSON export | [/api/export/doaj/[paperId]](https://ijitest.org/api/export/doaj) |
| **OAI-PMH Harvesters** | 🟢 **Active** | OAI-PMH 2.0 protocol, Dublin Core XML (`oai_dc`) | [/api/oai](https://ijitest.org/api/oai) |
| **COUNTER / SUSHI** | 🟢 **Active** | Release 5 compliant usage reporting (TR, TR_J1, IR, IR_A1) | [/api/sushi/reports](https://ijitest.org/api/sushi/reports) |
| **PubMed / PMC** | 🟡 **Ready** | JATS XML 1.3 Schema validation | [/api/export/jats/[paperId]](https://ijitest.org/api/export/jats) |

---

## 2. DOAJ Application Prerequisites & Checklist

To apply for the **DOAJ Seal**:
- [x] Journal website has a dedicated URL with its own domain ([https://ijitest.org](https://ijitest.org)).
- [x] Clear Editorial Board with institutional affiliations and academic credentials.
- [x] Explicit Double-Blind Peer Review workflow documented on the website.
- [x] Detailed Author Guidelines with transparent APC (Article Processing Charges) disclosures.
- [x] Creative Commons CC-BY 4.0 license stated in metadata and PDF galleys.
- [x] Plagiarism policy with iThenticate / Turnitin screening.
- [x] Archival policy: Digital preservation through Zenodo and OAI-PMH repository.
- [x] Machine-readable metadata available for all published papers.

---

## 3. Highwire Press (Google Scholar) Verification Checklist

Google Scholar crawlers parse papers automatically when these meta tags are present in `<head>`:
```html
<meta name="citation_title" content="Fabrication of Multipurpose Agriculture Machine" />
<meta name="citation_author" content="S. Sai Durga Jagan Mohan" />
<meta name="citation_author" content="P. Dinesh" />
<meta name="citation_publication_date" content="2026/01/15" />
<meta name="citation_journal_title" content="International Journal of Innovative Trends in Engineering, Science and Technology" />
<meta name="citation_volume" content="1" />
<meta name="citation_issue" content="1" />
<meta name="citation_doi" content="10.68139/ijitest.2026.01.007" />
<meta name="citation_pdf_url" content="https://ijitest.org/api/files/published/007.pdf" />
```
*Status in IJITEST:* **Implemented & Verified** in [archives/[volume]/[issue]/[paperId]/page.tsx](file:///Z:/projects/IJITEST%20Main/IJITEST/src/app/%28main%29/archives/%5Bvolume%5D/%5Bissue%5D/%5BpaperId%5D/page.tsx).

---

## 4. OAI-PMH 2.0 Harvester Endpoints

Library networks (WorldCat, BASE, OpenAIRE) harvest metadata via `/api/oai`:
* **Identify:** `https://ijitest.org/api/oai?verb=Identify`
* **ListMetadataFormats:** `https://ijitest.org/api/oai?verb=ListMetadataFormats`
* **ListSets:** `https://ijitest.org/api/oai?verb=ListSets`
* **ListRecords:** `https://ijitest.org/api/oai?verb=ListRecords&metadataPrefix=oai_dc`
