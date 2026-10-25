# Crossref System Guide & Integration Specifications

**Member Organization:** Felix Academic Publications  
**Journal:** International Journal of Innovative Trends in Engineering, Science and Technology (IJITEST)  
**Assigned DOI Prefix:** `10.68139`  
**Crossref Member Role:** `bbpj`  
**Primary Contact Email:** `razh1977@gmail.com` / `editor@ijitest.org`

---

## 1. Authentication & System Endpoints

### Crucial Username Requirement
Crossref requires that HTTPS POST and automated/third-party submissions format the login ID as `email/role`:
* **Login ID (`login_id`):** `razh1977@gmail.com/bbpj`
* **Password (`login_passwd`):** `Asaph2018Felix`

### Service Endpoints

| Environment | Purpose | Deposit Servlet URL | Web Admin Portal |
| :--- | :--- | :--- | :--- |
| **Test / Staging** | XML schema validation, mock deposits | `https://test.crossref.org/servlet/deposit` | [test.crossref.org](https://test.crossref.org) |
| **Production / Live** | Real-world DOI registration & DataCite indexing | `https://doi.crossref.org/servlet/deposit` | [doi.crossref.org](https://doi.crossref.org) |

---

## 2. HTTPS POST Deposit Protocol (`doMDUpload`)

All programmatic deposits are submitted as `multipart/form-data` with three required parameters:

```http
POST /servlet/deposit HTTP/1.1
Host: test.crossref.org
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryX

------WebKitFormBoundaryX
Content-Disposition: form-data; name="operation"

doMDUpload
------WebKitFormBoundaryX
Content-Disposition: form-data; name="login_id"

razh1977@gmail.com/bbpj
------WebKitFormBoundaryX
Content-Disposition: form-data; name="login_passwd"

[PASSWORD]
------WebKitFormBoundaryX
Content-Disposition: form-data; name="fname"; filename="cr-batch-IJITEST-2026-001.xml"
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/5.3.1" ...>
  ...
</doi_batch>
------WebKitFormBoundaryX--
```

### Expected Response
Crossref replies synchronously with `HTTP 200`:
```html
<html>
<head><title>SUCCESS</title></head>
<body>
<h2>SUCCESS</h2>
<p>Your batch submission was successfully received.</p>
</body>
</html>
```
*Note: Crossref parses and registers the XML asynchronously. Queue confirmation is verified in the system logs.*

---

## 3. Crossref XML Schema 5.3.1 Best Practices

1. **Namespace Declarations:**
   ```xml
   <doi_batch xmlns="http://www.crossref.org/schema/5.3.1"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1"
              xmlns:ai="http://www.crossref.org/AccessIndicators.xsd"
              version="5.3.1"
              xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
   ```
2. **DOI & Resource Linking:**
   ```xml
   <doi_data>
     <doi>10.68139/ijitest.2026.01.001</doi>
     <resource>https://ijitest.org/article/ijitest-2026-001</resource>
     <collection property="crawler-based">
       <item crawler="iParadigms">
         <resource>https://ijitest.org/api/files/published/IJITEST-2026-001.pdf</resource>
       </item>
     </collection>
   </doi_data>
   ```
3. **Similarity Check / iParadigms:**
   Includes the direct PDF URL in the `<collection property="crawler-based">` element so Turnitin/iThenticate can crawl and index the paper automatically.

---

## 4. Official Tools & Validation

* **Crossref Web XML Parser:** [crossref.org/02publishers/parser.html](https://www.crossref.org/02publishers/parser.html)
* **Official GitLab Schema Repository:** [gitlab.com/crossref/schema](https://gitlab.com/crossref/schema/-/tree/master/best-practice-examples?ref_type=heads)
* **Education & Documentation:** [crossref.org/documentation](https://www.crossref.org/documentation/)
