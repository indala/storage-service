# Official DOI System & Handle Network Technical Specifications

**Governing Body:** International DOI Foundation (IDF) / DOI Federation  
**Underlying Architecture:** The Handle System (DONA Foundation / RFC 3650, 3651, 3652)  
**Standard:** ISO 26324 (Information and documentation — Digital Object Identifier system)

---

## 1. DOI Syntax Architecture

A Digital Object Identifier is an opaque, permanent alphanumeric string composed of two mandatory segments separated by a forward slash (`/`):

$$\underbrace{\mathbf{10.}}_{\text{Directory Indicator}}\;\underbrace{\mathbf{68139}}_{\text{Registrant Prefix}}\;/\;\underbrace{\mathbf{ijitest.2026.01.001}}_{\text{Suffix}}$$

### The Prefix
* **Directory Indicator:** Always `10.` designating the DOI directory within the global Handle System.
* **Registrant Code (e.g. `68139`):** Assigned exclusively to the member organization (Felix Academic Publications) by an authorized Registration Agency (Crossref).

### The Suffix
* Created and managed by the publisher.
* Case-insensitive in resolution (the DOI Proxy normalizes requests).
* Recommended Best Practice: Use semantic or sequential structures that reflect publication year, volume, issue, and article sequence (e.g., `ijitest.YYYY.VV.III` or `ijitest.YYYY.NNN`).

---

## 2. Resolution Mechanism & The Handle Proxy

When a reader, web browser, or machine crawler accesses a DOI:

```
[User / Browser] 
      │ 
      ▼ (Requests: https://doi.org/10.68139/ijitest.2026.01.001)
[Global Handle System / DOI Proxy (hdl.handle.net)]
      │
      ▼ (Resolves registered URL: https://ijitest.org/article/ijitest-2026-001)
[Publisher Server (ijitest.org)]
      │
      ▼ (Dynamic 308 redirect to permanent archive)
[Published Article Archive Page (/archives/volume1/issue1/IJITEST-2026-001)]
```

---

## 3. Mandatory Landing Page Requirements (IDF Handbook §3.8)

The International DOI Foundation strictly regulates what a DOI must point to:

1. **Never Point Directly to a PDF File:**  
   A DOI must resolve to an **HTML Landing Page** (Response Page), not directly to a binary `.pdf` file.
2. **Required Elements on the Landing Page:**
   * Full bibliographic citation (Title, Authors, Affiliations, Volume, Issue, Year, Pages).
   * Prominent display of the DOI string itself in actionable format (`https://doi.org/...`).
   * Persistent access or download mechanism for the full-text content.
   * Copyright and licensing declaration (e.g. Creative Commons CC-BY 4.0).
3. **Persistence Guarantee:**  
   If an article is retracted or corrected, the DOI must still resolve to a landing page containing the formal Retraction Notice or Corrigendum. It must never return an HTTP 404.
