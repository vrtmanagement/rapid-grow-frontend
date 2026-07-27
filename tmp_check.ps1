$errs = npx tsc --noEmit 2>&1 | Select-String 'error TS'
$errs | ForEach-Object { $_.ToString() } | Set-Content baseline_errors.txt
(Get-Content baseline_errors.txt).Count
