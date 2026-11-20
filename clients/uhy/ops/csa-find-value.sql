-- UHY-ASK pilot, Stage 1: which table and column hold a value seen on the CSA screen.
-- Read-only. Prints table, column and match count only, never the matching values.
-- Set @needle to a distinctive value from one company's CSA screen (for example a
-- company number or an unusual surname), run, note the table/column, then clear it.
--   sqlcmd -E -S <instance> -d <CSA database> -i csa-find-value.sql -v needle="..." -W
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

DECLARE @needle nvarchar(200) = N'$(needle)';
IF LEN(@needle) < 4 BEGIN RAISERROR('Use a value of at least 4 characters.', 16, 1); RETURN; END;

DECLARE @results TABLE (table_name sysname, column_name sysname, matches int);
DECLARE @sql nvarchar(max), @t sysname, @s sysname, @c sysname, @n int;

DECLARE cols CURSOR LOCAL FAST_FORWARD FOR
  SELECT s.name, t.name, c.name
  FROM sys.tables t
  JOIN sys.schemas s ON s.schema_id = t.schema_id
  JOIN sys.columns c ON c.object_id = t.object_id
  JOIN sys.types ty ON ty.user_type_id = c.user_type_id
  WHERE ty.name IN ('char','varchar','nchar','nvarchar','text','ntext');

OPEN cols;
FETCH NEXT FROM cols INTO @s, @t, @c;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'SELECT @n = COUNT(*) FROM ' + QUOTENAME(@s) + N'.' + QUOTENAME(@t)
           + N' WHERE CAST(' + QUOTENAME(@c) + N' AS nvarchar(max)) LIKE N''%'' + @needle + N''%''';
  EXEC sp_executesql @sql, N'@needle nvarchar(200), @n int OUTPUT', @needle = @needle, @n = @n OUTPUT;
  IF @n > 0 INSERT @results VALUES (@s + N'.' + @t, @c, @n);
  FETCH NEXT FROM cols INTO @s, @t, @c;
END
CLOSE cols; DEALLOCATE cols;

SELECT table_name, column_name, matches FROM @results ORDER BY matches, table_name;
