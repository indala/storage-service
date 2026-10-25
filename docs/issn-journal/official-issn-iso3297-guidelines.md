# Official ISSN International Centre (ISO 3297) Guidelines for Online Serials

**Governing Body:** ISSN International Centre (CIEPS - Centre International de l'ISSN), Paris, France  
**International Standard:** ISO 3297 (Information and documentation — International Standard Serial Number)  
**Standard Manual:** *ISSN Manual: Rules for Online Serials & Electronic Media*

---

## 1. Composition & Syntax of the ISSN

An ISSN is an 8-digit international identifier consisting of:
* The prefix **"ISSN"** followed by a single space.
* Two groups of four digits separated by a hyphen: `ISSN XXXX-XXXX`.
* The first seven digits form the title identifier.
* The eighth digit is a mathematical **check digit**.

### Modulus 11 Check Digit Algorithm
The check digit is calculated using a modulus 11 algorithm with weights 8 through 2 applied to the first 7 digits:

$$\text{Weighted Sum} = (d_1 \times 8) + (d_2 \times 7) + (d_3 \times 6) + (d_4 \times 5) + (d_5 \times 4) + (d_6 \times 3) + (d_7 \times 2)$$

$$\text{Remainder} = \text{Weighted Sum} \pmod{11}$$

$$\text{Check Digit} = (11 - \text{Remainder}) \pmod{11}$$

* If the check digit is `10`, it is represented by the uppercase letter **"X"** (e.g. `ISSN 1050-124X`).

---

## 2. Official Rules for Electronic & Online Serials

According to the *ISSN Manual*, electronic publications must comply with the following display and usage rules:

### A. Location of the ISSN on Digital Portals
1. **Homepage Header & Navigation:** The ISSN must appear prominently on the main landing page, masthead, header, or footer.
2. **About / Colophon Page:** Displayed with the full journal title, publisher information, editorial board, and publication frequency.
3. **Article Detail Pages & PDFs:** Each published article PDF and HTML abstract view must include the ISSN in the running header or citation block.

### B. Single ISSN Rule for Digital Formats
* When an online serial is made available in multiple electronic file formats (such as HTML, PDF, EPUB, or XML), **the exact same Online ISSN applies to all digital file representations**.
* Publishers do not request separate numbers for PDF vs HTML.

### C. Strict Separation of Media Formats
* If an online serial also possesses a printed edition, **separate ISSNs are assigned**:
  * `Print ISSN: XXXX-XXXX`
  * `Online ISSN: 3139-6887`
* A print ISSN must **never** be substituted on an online-only platform, and vice versa.

### D. Title Changes & Integrity
* An ISSN is tied strictly to the registered journal key title:  
  *Key Title:* `International Journal of Innovative Trends in Engineering, Science and Technology`  
  *Abbreviated Key Title:* `Int. j. innov. trends eng. sci. technol.`
* Any significant grammatical change to the title requires notification to the National or International ISSN Centre and may trigger the assignment of a new ISSN.
