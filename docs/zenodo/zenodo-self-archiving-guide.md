# Zenodo Secondary Self-Archiving & DataCite DOI Guide

**Community Page:** [zenodo.org/communities/ijitest](https://zenodo.org/communities/ijitest)  
**Assigned DOI Prefix:** `10.5281`  
**Purpose:** CERN/OpenAIRE Open Access permanent archiving, long-term preservation, and DataCite DOI minting.  
**Licensing:** Creative Commons Attribution 4.0 International (CC-BY 4.0)

---

## 1. Archiving Architecture & Dual DOI Strategy

IJITEST uses a **Dual DOI Strategy** that maximizes visibility without identifier collisions:

1. **Primary Canonical DOI (Crossref):** Assigned under `10.68139/ijitest.*` and indexed across Crossref, Similarity Check, and publisher citation graphs.
2. **Secondary Self-Archiving DOI (Zenodo):** Assigned under `10.5281/zenodo.*` and indexed across CERN, DataCite, OpenAIRE, and the European Commission's Open Science Monitor.
3. **Relation Linking:** Every Zenodo deposition includes a `related_identifiers` node marking it as `isIdenticalTo` the primary Crossref DOI.

---

## 2. Automated 3-Step Deposit API Workflow

Implemented in `src/actions/doi-registration.ts`:

```
┌─────────────────────────────────┐
│ 1. POST /deposit/depositions    │ Reserves a new Zenodo deposition and pre-allocates
│    (Metadata payload)           │ the DataCite DOI (10.5281/zenodo.[ID]).
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. PUT /deposit/depositions/... │ Uploads the final published Galley PDF
│    /files/[filename.pdf]        │ directly into the deposition bucket.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 3. POST /deposit/depositions/   │ Publishes the record, mints the live DataCite DOI,
│    [ID]/actions/publish         │ and indexes the paper across OpenAIRE.
└─────────────────────────────────┘
```

---

## 3. Verified Live Zenodo DOIs (Volume 1, Issue 1)

These 9 articles are live on Zenodo and DataCite:

| Submission ID | Paper ID | Live Zenodo DOI | Zenodo Community Link |
| :-: | :--- | :--- | :--- |
| 7 | `IJITEST-2026-007` | [10.5281/zenodo.22847060](https://doi.org/10.5281/zenodo.22847060) | [Record 22847060](https://zenodo.org/records/22847060) |
| 8 | `IJITEST-2026-008` | [10.5281/zenodo.22847305](https://doi.org/10.5281/zenodo.22847305) | [Record 22847305](https://zenodo.org/records/22847305) |
| 9 | `IJITEST-2026-009` | [10.5281/zenodo.22847485](https://doi.org/10.5281/zenodo.22847485) | [Record 22847485](https://zenodo.org/records/22847485) |
| 10 | `IJITEST-2026-010` | [10.5281/zenodo.22847579](https://doi.org/10.5281/zenodo.22847579) | [Record 22847579](https://zenodo.org/records/22847579) |
| 15 | `IJITEST-2026-015` | [10.5281/zenodo.22847759](https://doi.org/10.5281/zenodo.22847759) | [Record 22847759](https://zenodo.org/records/22847759) |
| 16 | `IJITEST-2026-016` | [10.5281/zenodo.22847850](https://doi.org/10.5281/zenodo.22847850) | [Record 22847850](https://zenodo.org/records/22847850) |
| 17 | `IJITEST-2026-017` | [10.5281/zenodo.22115427](https://doi.org/10.5281/zenodo.22115427) | [Record 22115427](https://zenodo.org/records/22115427) |
| 18 | `IJITEST-2026-018` | [10.5281/zenodo.22847710](https://doi.org/10.5281/zenodo.22847710) | [Record 22847710](https://zenodo.org/records/22847710) |
| 19 | `IJITEST-2026-019` | [10.5281/zenodo.22131568](https://doi.org/10.5281/zenodo.22131568) | [Record 22131568](https://zenodo.org/records/22131568) |

---

## 4. Best Practices for Zenodo Access Rights
To ensure full compliance with Open Access mandates:
* Always ensure `"access_right": "open"` is included in the deposition JSON payload.
* Specify `"license": "cc-by-4.0"`.
* If a file appears restricted, edit the deposition metadata on Zenodo to unlock the PDF file for public download.
