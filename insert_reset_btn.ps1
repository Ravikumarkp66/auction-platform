$file = "C:\Users\Ravikumar K P\OneDrive\Desktop\KP\frontend\src\app\live-auction\page.jsx"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

$insertAfter = 1454  # line 1455 = </button> for Undo Last (0-indexed: 1454)
$newLines = @(
    '',
    '                              <button ',
    '                                onClick={handleResetPools}',
    '                                disabled={poolA.length === 0 && poolB.length === 0}',
    '                                className="px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-xl text-[10px] font-black uppercase tracking-tighter text-red-400 hover:text-white hover:bg-red-700/50 disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2"',
    '                              >',
    '                                 Reset All',
    '                              </button>'
)

$before = $lines[0..$insertAfter]
$after = $lines[($insertAfter + 1)..($lines.Length - 1)]
$result = $before + $newLines + $after

[System.IO.File]::WriteAllLines($file, $result, [System.Text.Encoding]::UTF8)
Write-Host "Done. Inserted Reset All button at line 1456."
