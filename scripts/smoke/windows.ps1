# The Nabd window as Win32 sees it, for the Windows smoke test (screen.mjs).
#
#   windows.ps1 <process name> count      how many Nabd windows are shown
#   windows.ps1 <process name> close      post WM_CLOSE to them, as their close
#                                         button would
#   windows.ps1 <process name> describe   every top-level window of those
#                                         processes, for a failure's diagnostics
#
# A shown window is a top-level window that is visible, has no owner and is
# not a tool window. Process.MainWindowHandle will not do: the single-instance
# plugin keeps a layered tool window marked visible (so that it gets messages),
# and that is the one it finds.

param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][ValidateSet('count', 'close', 'describe')][string]$Command
)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class NabdWindows {
    delegate bool EnumProc(IntPtr window, IntPtr data);

    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr data);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr window, uint relation);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongW")] static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr window, uint message, IntPtr w, IntPtr l);

    const uint GW_OWNER = 4;
    const int GWL_EXSTYLE = -20;
    const int WS_EX_TOOLWINDOW = 0x80;
    const uint WM_CLOSE = 0x10;

    public static List<IntPtr> Of(uint[] pids) {
        var found = new List<IntPtr>();
        EnumWindows(delegate (IntPtr window, IntPtr data) {
            uint pid;
            GetWindowThreadProcessId(window, out pid);
            if (Array.IndexOf(pids, pid) >= 0) found.Add(window);
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public static bool IsShown(IntPtr window) {
        return IsWindowVisible(window)
            && GetWindow(window, GW_OWNER) == IntPtr.Zero
            && (GetWindowLong(window, GWL_EXSTYLE) & WS_EX_TOOLWINDOW) == 0;
    }

    public static void Close(IntPtr window) {
        PostMessage(window, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
    }

    public static string Describe(IntPtr window) {
        var title = new StringBuilder(256);
        GetWindowText(window, title, title.Capacity);
        return String.Format("{0} shown={1} visible={2} exstyle=0x{3:X} title='{4}'",
            window, IsShown(window), IsWindowVisible(window), GetWindowLong(window, GWL_EXSTYLE), title);
    }
}
'@

$pids = [uint32[]]@(Get-Process -Name $Name -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$windows = [NabdWindows]::Of($pids)
$shown = @(foreach ($window in $windows) { if ([NabdWindows]::IsShown($window)) { $window } })

switch ($Command) {
  'count' { $shown.Count }
  'close' { foreach ($window in $shown) { [NabdWindows]::Close($window) } }
  'describe' {
    if ($pids.Count -eq 0) { "no $Name process" }
    foreach ($window in $windows) { [NabdWindows]::Describe($window) }
  }
}
