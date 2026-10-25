# Official Crossref Metadata Deposit Servlet (HTTPS POST) Specifications

**Source:** [Crossref Official Documentation (crossref.org)](https://www.crossref.org/documentation/register-content/direct-deposit-xml/https-post/)  
**Standard:** Crossref Content Registration HTTPS POST Protocol

---

## 1. System Endpoints

Crossref accepts programmatic metadata registrations via its HTTP servlet:

| Environment | Endpoint URL | Description |
| :--- | :--- | :--- |
| **Production System** | `https://doi.crossref.org/servlet/deposit` | Live DOI registration. Accessible to all active members. |
| **Test / Staging System** | `https://test.crossref.org/servlet/deposit` | Sandbox integration testing. Requires test account activation by Crossref Support. |

---

## 2. Request Protocol & Parameters

* **HTTP Method:** `POST`
* **Content-Type / Encoding:** `multipart/form-data`
* **Character Encoding:** UTF-8

### Required Form Fields

| Parameter | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| **`operation`** | String | Optional (Recommended) | Specifies the submission action. Set to `doMDUpload` for full Crossref XML metadata batches conforming to the schema. |
| **`login_id`** | String | **Mandatory** | The Crossref credentials. Must follow the format: `email@domain.com/role` (e.g. `razh1977@gmail.com/bbpj`). Case-sensitive. |
| **`login_passwd`** | String | **Mandatory** | The account password. Case-sensitive. |
| **`fname`** | File Payload | **Mandatory** | The XML metadata file. Must be valid UTF-8 XML conforming to the Crossref schema. |
| **`subType`** | String | Optional | Set to `cm` only for conflict management submissions. Leave blank for standard deposits. |

---

## 3. Official CLI & Code Implementations

### cURL (Command Line)
```bash
curl -F "operation=doMDUpload" \
     -F "login_id=razh1977@gmail.com/bbpj" \
     -F "login_passwd=Asaph2018Felix" \
     -F "fname=@/path/to/IJITEST-batch-2026.xml" \
     https://doi.crossref.org/servlet/deposit
```

### Node.js / TypeScript (Native Fetch)
```typescript
import fs from 'fs';

async function depositToCrossref(xmlFilePath: string, isTest = false) {
  const endpoint = isTest
    ? "https://test.crossref.org/servlet/deposit"
    : "https://doi.crossref.org/servlet/deposit";

  const xmlContent = fs.readFileSync(xmlFilePath, 'utf8');
  const formData = new FormData();
  formData.append("operation", "doMDUpload");
  formData.append("login_id", "razh1977@gmail.com/bbpj");
  formData.append("login_passwd", "Asaph2018Felix");
  formData.append("fname", new Blob([xmlContent], { type: "application/xml" }), "deposit.xml");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();
  console.log(`Status: ${response.status}`, responseText);
  return response.ok;
}
```

### Python (Requests)
```python
import requests

def deposit_crossref(xml_path, is_test=False):
    url = "https://test.crossref.org/servlet/deposit" if is_test else "https://doi.crossref.org/servlet/deposit"
    
    data = {
        'operation': 'doMDUpload',
        'login_id': 'razh1977@gmail.com/bbpj',
        'login_passwd': 'Asaph2018Felix'
    }
    
    with open(xml_path, 'rb') as f:
        files = {'fname': (xml_path, f, 'application/xml')}
        r = requests.post(url, data=data, files=files)
        
    print(r.status_code, r.text)
    return r.status_code == 200
```

---

## 4. Expected Responses & Error Codes

* **HTTP 200 Success:**
  ```html
  <html>
  <head><title>SUCCESS</title></head>
  <body>
  <h2>SUCCESS</h2>
  <p>Your batch submission was successfully received.</p>
  </body>
  </html>
  ```
* **HTTP 400 Bad Request:** Occurs if `Content-Type` is not `multipart/form-data` or `fname` is missing.
* **HTTP 401 Unauthorized:** Invalid `login_id` format (missing `/role`) or incorrect password.
* **Asynchronous Log:** Final schema validation and DOI activation happen asynchronously in Crossref's processing queue (typically 2–15 minutes).
