-- UHY-ASK pilot: read-only access to the CSA database for one Windows account.
-- CHANGES SQL SERVER SECURITY: run only with UHY's agreement, as a SQL administrator.
--   sqlcmd -E -S <instance> -i csa-readonly-login.sql -v account="UHYASK\svc-pilot" csadb="<CSA database>"
-- Grants db_datareader on the CSA database only: SELECT on its tables, nothing else.
SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$(account)')
  CREATE LOGIN [$(account)] FROM WINDOWS WITH DEFAULT_DATABASE = [$(csadb)];
GO
USE [$(csadb)];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(account)')
  CREATE USER [$(account)] FOR LOGIN [$(account)];
ALTER ROLE db_datareader ADD MEMBER [$(account)];
-- Belt and braces: explicitly deny writes.
ALTER ROLE db_denydatawriter ADD MEMBER [$(account)];
GO
SELECT dp.name AS member, r.name AS role
FROM sys.database_role_members m
JOIN sys.database_principals r ON r.principal_id = m.role_principal_id
JOIN sys.database_principals dp ON dp.principal_id = m.member_principal_id
WHERE dp.name = N'$(account)';
