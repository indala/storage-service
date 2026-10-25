# Crossref Support Official Correspondence & Authorization

**Ticket Reference:** [#652389](https://support.crossref.org/hc/requests/652389)  
**Assigned Technical Officer:** Danilo Kuljanin (Technical Support Contractor, Crossref)  
**Recipient:** Dr. Ravi Babu T (`razh1977@gmail.com`)  
**Organization:** Felix Academic Publications  
**Assigned Role:** `bbpj`  
**Assigned Prefix:** `10.68139`

---

## Official Transcript

```text
From: Danilo Kuljanin (Crossref) <support@crossref.org>
Date: Tue, Oct 6, 2026 at 6:07 AM
Subject: [Crossref] Re: Request for Test Environment Access (test.crossref.org) - Prefix 10.68139
To: Razh1977 <razh1977@gmail.com>

Dear Dr. Babu,

Thank you for contacting Crossref Support.

I've created an account for Felix Academic Publications in the test system. 
The role (bbpj) and DOI prefix (10.68139) are the same ones that you use for the production system.

You should receive an email in a few moments with a link to create a password for your test system username. 
Please note that for HTTPS POST and third-party submissions (such as OJS), 
your username (login_id) should be formatted as email/role: razh1977@gmail.com/bbpj

Once you set that password, you will be able to access the test system at 
https://test.crossref.org the same way that you would typically access our live/production system (doi.crossref.org).

We also find that members who are creating, testing, and registering their own XML 
often times find our XML samples files: 
https://gitlab.com/crossref/schema/-/tree/master/best-practice-examples?ref_type=heads 
to be quite useful. 

You can also validate your Crossref XML prior to upload using our parser: 
https://www.crossref.org/02publishers/parser.html.

Please note, the test system is not an exact match to the production system, 
so you won't be able to test everything. Let us know if you have any problems.

Best regards,
Danilo Kuljanin
Technical Support Contractor
@CrossrefSupport
```

---

## Configuration Impact & Applied Fixes

1. **Environment Variables:**
   * `CROSSREF_USERNAME` updated from `razh1977@gmail.com` to `razh1977@gmail.com/bbpj`.
   * `CROSSREF_ROLE` explicitly set to `bbpj`.
2. **Automated Formatting in Code:**
   * In [IJITEST/src/lib/doi-config.ts](file:///Z:/projects/IJITEST%20Main/IJITEST/src/lib/doi-config.ts), added logic that automatically formats the login ID as `${username}/${role}` if the role is missing, ensuring both manual entries and environment keys succeed.
