$file = "C:\Users\Ravikumar K P\OneDrive\Desktop\KP\frontend\src\app\live-auction\page.jsx"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Replace the require('jspdf') line with just using the imported jsPDF
$old = "                        const { jsPDF } = require('jspdf');" + "`r`n" + "                        const doc = new jsPDF("
$new = "                        const doc = new jsPDF("
$content = $content.Replace($old, $new)

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done. Replaced require with imported jsPDF."
