$filePath = "C:\Users\Ravikumar K P\OneDrive\Desktop\KP\frontend\src\app\overlay\page.jsx"
$lines = Get-Content -Encoding UTF8 $filePath
# Keep only lines 1 to 479 (0-indexed: 0 to 478)
$trimmed = $lines[0..478]
[System.IO.File]::WriteAllLines($filePath, $trimmed)
Write-Host "Done. File now has $($trimmed.Count) lines."
