// Title of the window in front, from Windows (user32 GetForegroundWindow + GetWindowText), so that with several DOFUS
// windows (several accounts) the active one is the one the player is playing. Same kind of read-only OS information
// as the window list: nothing about the game's process, memory or input. One small PowerShell loop, no dependency;
// it prints a line only when the title changes, and ends with the companion.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const script = (parentPid) => `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class AtlasFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
}
"@
$last = $null
while (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue) {
  $sb = New-Object System.Text.StringBuilder 512
  [void][AtlasFg]::GetWindowText([AtlasFg]::GetForegroundWindow(), $sb, 512)
  $t = $sb.ToString()
  if ($t -ne $last) { [Console]::Out.WriteLine($t); [Console]::Out.Flush(); $last = $t }
  Start-Sleep -Milliseconds 700
}`;

/** Calls `onTitle` with the foreground window's title each time it changes. Returns a stop function. */
export function watchForeground(onTitle, onError = () => {}) {
  const encoded = Buffer.from(script(process.pid), 'utf16le').toString('base64');
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  createInterface({ input: child.stdout }).on('line', (l) => onTitle(l.trim()));
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  child.on('exit', (code) => { if (code) onError(new Error(err.trim().split('\n')[0] || `exit ${code}`)); });
  child.on('error', onError);
  return () => child.kill();
}
