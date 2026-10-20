-- UHY-ASK pilot, Stage 1: CSA schema export. Read-only; no client values.
-- Run against the CSA database, e.g.:
--   sqlcmd -E -S <instance> -d <CSA database> -i csa-schema.sql -o C:\uhy-pilot\out\csa-schema.csv -s "," -W
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

WITH rowcounts AS (
  SELECT p.object_id, SUM(p.rows) AS row_count
  FROM sys.partitions p
  WHERE p.index_id IN (0, 1)
  GROUP BY p.object_id
),
pk AS (
  SELECT ic.object_id, ic.column_id
  FROM sys.indexes i
  JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
  WHERE i.is_primary_key = 1
)
SELECT
  s.name AS schema_name,
  t.name AS table_name,
  rc.row_count,
  c.column_id,
  c.name AS column_name,
  ty.name AS data_type,
  c.max_length,
  c.is_nullable,
  CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
  fk_t.name AS references_table,
  fk_c.name AS references_column
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
LEFT JOIN rowcounts rc ON rc.object_id = t.object_id
LEFT JOIN pk ON pk.object_id = t.object_id AND pk.column_id = c.column_id
LEFT JOIN sys.foreign_key_columns fkc ON fkc.parent_object_id = t.object_id AND fkc.parent_column_id = c.column_id
LEFT JOIN sys.tables fk_t ON fk_t.object_id = fkc.referenced_object_id
LEFT JOIN sys.columns fk_c ON fk_c.object_id = fkc.referenced_object_id AND fk_c.column_id = fkc.referenced_column_id
ORDER BY s.name, t.name, c.column_id;

-- Views can hold the friendlier shapes CSA itself uses.
SELECT s.name AS schema_name, v.name AS view_name
FROM sys.views v JOIN sys.schemas s ON s.schema_id = v.schema_id
ORDER BY s.name, v.name;
