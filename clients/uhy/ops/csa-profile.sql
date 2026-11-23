-- UHY-ASK pilot: profile of the restored CSA copy, for writing the mapping (csa-mapping.json).
-- Read-only. Returns CSA's own code tables and counts of rows per code. It returns no company or
-- person names, numbers, addresses or other client values: digits are shown only as the shape 9.
-- Run on the pilot machine against CSA_Copy:
--   .\run-sql.ps1 -Server '.\SQLEXPRESS' -Database CSA_Copy -File .\csa-profile.sql -OutDir C:\Clerk\csa-out
SET NOCOUNT ON;

-- 1. Position types in use (director, secretary, member...), all rows and current rows.
SELECT m.MTYPE, d.des, d.mcat, COUNT(*) AS rows_all,
       SUM(CASE WHEN m.TILLDATE IS NULL THEN 1 ELSE 0 END) AS rows_current,
       SUM(CASE WHEN NULLIF(LTRIM(RTRIM(m.STAADD_1E)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_stated_address, SUM(CASE WHEN m.SINCEDATE IS NOT NULL THEN 1 ELSE 0 END) AS has_since
FROM MASTER m LEFT JOIN (SELECT MTYPE, MIN(DES) AS des, MIN(MCAT) AS mcat FROM MTPDEF GROUP BY MTYPE) d ON d.MTYPE = m.MTYPE
GROUP BY m.MTYPE, d.des, d.mcat ORDER BY rows_all DESC;

-- 2. Company jurisdiction, type and status codes in use.
SELECT c.JURISD, c.COMTYP, c.COMSTA, c.ISACTIVE, COUNT(*) AS n,
       (SELECT MIN(t.DES) FROM COMTYP t WHERE t.COMTYP = c.COMTYP AND t.JURISD_INC = c.JURISD) AS comtyp_des,
       (SELECT MIN(s.DES) FROM COMSTA s WHERE s.COMSTA = c.COMSTA) AS comsta_des
FROM CLIENT c GROUP BY c.JURISD, c.COMTYP, c.COMSTA, c.ISACTIVE ORDER BY n DESC;

-- 3. What the company record holds, for active companies.
SELECT COUNT(*) AS active_companies, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(NAME_2)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_name_2, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(NAME_C)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_name_c, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(COMNUM)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_comnum,
       SUM(CASE WHEN INCDATE IS NOT NULL THEN 1 ELSE 0 END) AS has_incdate, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(REGADD_1E)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_regadd, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(AC_DDMM)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_year_end,
       SUM(CASE WHEN LASTAR IS NOT NULL THEN 1 ELSE 0 END) AS has_lastar, SUM(CASE WHEN ARSCH IS NOT NULL THEN 1 ELSE 0 END) AS has_arsch
FROM CLIENT WHERE ISACTIVE = 1;

-- 4. Shapes of the client code, company number and year end (digits shown as 9).
SELECT 'client code length' AS what, CAST(LEN(CLIENTID) AS nvarchar(20)) AS shape, COUNT(*) AS n FROM CLIENT GROUP BY LEN(CLIENTID)
UNION ALL SELECT 'company number', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COMNUM, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9'), COUNT(*) FROM CLIENT WHERE ISACTIVE = 1 GROUP BY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COMNUM, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9') HAVING COUNT(*) >= 5
UNION ALL SELECT 'year end AC_DDMM', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(AC_DDMM, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9'), COUNT(*) FROM CLIENT WHERE ISACTIVE = 1 GROUP BY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(AC_DDMM, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9')
ORDER BY what, n DESC;

-- 5. People and corporate entities: type codes and which fields are filled.
SELECT TYPE, SUBTYPE, COUNT(*) AS n, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(NAME_2)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_name_2, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(FORMNAME)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_formname, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(LEGALNAME)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_legalname,
       SUM(CASE WHEN NULLIF(LTRIM(RTRIM(NAME_1C)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_name_zh, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(IDNUM)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_idnum, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(PASSPORT)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_passport, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(REGADD_1E)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_address
FROM ENTITY GROUP BY TYPE, SUBTYPE ORDER BY n DESC;

-- 6. How many versions an entity has, and the SNUM values used.
SELECT 'entity versions' AS what, CAST(v AS nvarchar(20)) AS value, COUNT(*) AS n FROM (SELECT ENTITYID, COUNT(*) AS v FROM ENTITY GROUP BY ENTITYID) x GROUP BY v
UNION ALL SELECT 'ENTITY.SNUM', SNUM, COUNT(*) FROM ENTITY GROUP BY SNUM
UNION ALL SELECT 'MASTER.SNUM', SNUM, COUNT(*) FROM MASTER GROUP BY SNUM
ORDER BY what, n DESC;

-- 7. Shareholdings by position type and register.
SELECT MTYPE, REGIST, COUNT(*) AS n, SUM(CASE WHEN SHARES > 0 THEN 1 ELSE 0 END) AS with_shares,
       SUM(CASE WHEN TRUSTID <> '' THEN 1 ELSE 0 END) AS with_trust
FROM MEMSHA GROUP BY MTYPE, REGIST ORDER BY n DESC;

-- 8. Share classes: which amount columns are used and how they relate.
SELECT CURRCODE, ISACTIVE, ISORDINARY, COUNT(*) AS n,
       SUM(CASE WHEN PAR > 0 THEN 1 ELSE 0 END) AS has_par, SUM(CASE WHEN ISHARES > 0 THEN 1 ELSE 0 END) AS has_issued,
       SUM(CASE WHEN XSHARES > 0 THEN 1 ELSE 0 END) AS has_xshares, SUM(CASE WHEN ASHARES > 0 THEN 1 ELSE 0 END) AS has_ashares,
       SUM(CASE WHEN PAID_CASH + PAID_ASSET + PAID_INT > 0 THEN 1 ELSE 0 END) AS has_paid,
       SUM(CASE WHEN REG_CASH + REG_ASSET + REG_INT > 0 THEN 1 ELSE 0 END) AS has_reg,
       SUM(CASE WHEN INV_CASH + INV_ASSET + INV_INT > 0 THEN 1 ELSE 0 END) AS has_inv,
       SUM(CASE WHEN REG_CASH + REG_ASSET + REG_INT = PAID_CASH + PAID_ASSET + PAID_INT THEN 1 ELSE 0 END) AS reg_equals_paid,
       SUM(CASE WHEN ISHARES * PAR = PAID_CASH + PAID_ASSET + PAID_INT THEN 1 ELSE 0 END) AS issued_x_par_equals_paid
FROM CLISHA GROUP BY CURRCODE, ISACTIVE, ISORDINARY ORDER BY n DESC;

-- 9. Share class names in use (CSA's descriptions, e.g. Ordinary).
SELECT TOP 15 DES, COUNT(*) AS n FROM CLISHA GROUP BY DES ORDER BY n DESC;

-- 10. Do members' shares add up to the issued shares of each class, for active companies?
SELECT SUM(CASE WHEN ISNULL(h.held, 0) = s.ISHARES THEN 1 ELSE 0 END) AS classes_matching, COUNT(*) AS classes_checked
FROM CLISHA s JOIN CLIENT c ON c.CLIENTID = s.CLIENTID AND c.ISACTIVE = 1
LEFT JOIN (SELECT CLIENTID, CLASSID, SUM(SHARES) AS held FROM MEMSHA GROUP BY CLIENTID, CLASSID) h ON h.CLIENTID = s.CLIENTID AND h.CLASSID = s.CLASSID
WHERE s.ISACTIVE = 1;

-- 11. Client contacts: language codes and how many have an email.
SELECT 'DOCLANG' AS what, CAST(DOCLANG AS nvarchar(40)) AS value, COUNT(*) AS n, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(EMAIL)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_email FROM CLICON GROUP BY DOCLANG
UNION ALL SELECT 'SPELANG', SPELANG, COUNT(*), SUM(CASE WHEN NULLIF(LTRIM(RTRIM(EMAIL)), '') IS NOT NULL THEN 1 ELSE 0 END) FROM CLICON GROUP BY SPELANG
UNION ALL SELECT 'CONIDX', CAST(CONIDX AS nvarchar(40)), COUNT(*), SUM(CASE WHEN NULLIF(LTRIM(RTRIM(EMAIL)), '') IS NOT NULL THEN 1 ELSE 0 END) FROM CLICON GROUP BY CONIDX
UNION ALL SELECT 'CLIENT.FMTLANG', CAST(FMTLANG AS nvarchar(40)), COUNT(*), 0 FROM CLIENT WHERE ISACTIVE = 1 GROUP BY FMTLANG
ORDER BY what, n DESC;

-- 12. Business registration records: types, and the shape of the number.
SELECT 'BRTYPE / ISRO' AS what, ISNULL(BRTYPE, '') + ' / ' + CAST(ISRO AS nvarchar(5)) AS value, COUNT(*) AS n, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(BUSREGNO)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_number, SUM(CASE WHEN ENTITYID <> '' THEN 1 ELSE 0 END) AS has_entity, SUM(CASE WHEN TILLDATE IS NULL THEN 1 ELSE 0 END) AS is_current
FROM BUSREG GROUP BY BRTYPE, ISRO
UNION ALL SELECT 'BUSREGNO shape', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(BUSREGNO, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9'), COUNT(*), 0, 0, 0 FROM BUSREG GROUP BY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(BUSREGNO, '0', '9'), '1', '9'), '2', '9'), '3', '9'), '4', '9'), '5', '9'), '6', '9'), '7', '9'), '8', '9'), '9', '9') HAVING COUNT(*) >= 5
UNION ALL SELECT 'BRID', BRID, COUNT(*), 0, 0, 0 FROM BUSREG GROUP BY BRID HAVING COUNT(*) >= 5
ORDER BY what, n DESC;

-- 13. Overseas registrations (a non-Hong Kong company registered in Hong Kong).
SELECT JURISD, COMTYP, COMSTA, COUNT(*) AS n, SUM(CASE WHEN REGDATE IS NOT NULL THEN 1 ELSE 0 END) AS has_regdate, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(COMNUM)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_comnum, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(BUSNUM)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_busnum
FROM COMREG GROUP BY JURISD, COMTYP, COMSTA ORDER BY n DESC;

-- 14. Entity contacts: how many entities have an email on file.
SELECT COUNT(*) AS contact_rows, COUNT(DISTINCT ENTITYID) AS entities, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(EMAIL)), '') IS NOT NULL THEN 1 ELSE 0 END) AS has_email FROM ENTCON;
