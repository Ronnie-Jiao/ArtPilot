using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

[assembly: AssemblyVersion("1.0.4.0")]
[assembly: AssemblyFileVersion("1.0.4.0")]

namespace ArtPilot
{
    // Windows owns and renders the entire Common Item Dialog.
    // The native "选择" control accepts selected folders as well as files.
    // GetSelectedItems/Close: https://learn.microsoft.com/windows/win32/shell/common-file-dialog
    public static class BatchSourcePicker
    {
        private static readonly Guid ClientId = new Guid("61944648-714B-4A16-AC93-085025D1761D");
        private const uint SelectControl = 101;
        private const int Cancelled = unchecked((int)0x800704C7);

        [STAThread]
        private static int Main(string[] args)
        {
            EnableHighDpi();
            string output = null;
            try
            {
                string initial;
                if (args.Length >= 2)
                {
                    output = args[0];
                    initial = args[1];
                }
                else
                {
                    string request = Assembly.GetExecutingAssembly().Location + ".request.txt";
                    string[] lines = File.ReadAllLines(request, Encoding.UTF8);
                    if (lines.Length < 2) throw new InvalidDataException("选择窗口请求不完整。");
                    output = lines[0];
                    initial = lines[1];
                }

                List<string> selected = Pick(initial);
                WriteResult(output, selected == null ? "cancel" : "ok", selected);
                return 0;
            }
            catch (Exception error)
            {
                if (!String.IsNullOrEmpty(output))
                    WriteResult(output, "error", new List<string> { error.Message.Replace('\r', ' ').Replace('\n', ' ') });
                return 1;
            }
        }

        private static void EnableHighDpi()
        {
            // The embedded manifest normally establishes PerMonitorV2 before
            // Main. Keep native fallbacks for older Windows and alternate builds.
            try
            {
                if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return;
                // ERROR_ACCESS_DENIED: the manifest has already set awareness.
                if (Marshal.GetLastWin32Error() == 5) return;
            }
            catch (EntryPointNotFoundException) { }
            catch (DllNotFoundException) { }

            try
            {
                int result = SetProcessDpiAwareness(2);
                if (result >= 0 || result == unchecked((int)0x80070005)) return;
            }
            catch (EntryPointNotFoundException) { }
            catch (DllNotFoundException) { }

            try { SetProcessDPIAware(); }
            catch (EntryPointNotFoundException) { }
            catch (DllNotFoundException) { }
        }

        private static void WriteResult(string output, string status, List<string> paths)
        {
            string directory = Path.GetDirectoryName(Path.GetFullPath(output));
            Directory.CreateDirectory(directory);
            string temporary = output + ".tmp";
            string text = status + "\n";
            if (paths != null) text += String.Join("\n", paths.ToArray()) + "\n";
            File.WriteAllText(temporary, text, new UTF8Encoding(false));
            if (File.Exists(output)) File.Delete(output);
            File.Move(temporary, output);
        }

        private static List<string> Pick(string initial)
        {
            IFileOpenDialog dialog = (IFileOpenDialog)new FileOpenDialog();
            SelectionEvents events = new SelectionEvents(dialog);
            uint cookie = 0;
            try
            {
                uint options;
                dialog.GetOptions(out options);
                // Native navigation remains available; folders are accepted by
                // the native custom control without entering FOS_PICKFOLDERS mode.
                dialog.SetOptions(options | 0x40 | 0x200 | 0x800 | 0x1000 | 0x8 | 0x02000000);
                dialog.SetTitle("选择文件夹或图片");
                dialog.SetOkButtonLabel("打开");
                dialog.SetFileNameLabel("文件夹或图片");
                Guid clientId = ClientId;
                dialog.SetClientGuid(ref clientId);
                FilterSpec[] filters = {
                    new FilterSpec { Name = "图片及可置入文件", Spec = "*.jpg;*.jpeg;*.png;*.tif;*.tiff;*.psd;*.bmp;*.gif;*.webp;*.pdf;*.ai;*.eps" }
                };
                dialog.SetFileTypes((uint)filters.Length, filters);

                if (!Directory.Exists(initial))
                    initial = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                if (Directory.Exists(initial))
                {
                    IShellItem item = null;
                    try
                    {
                        Guid iid = typeof(IShellItem).GUID;
                        SHCreateItemFromParsingName(initial, IntPtr.Zero, ref iid, out item);
                        dialog.SetFolder(item);
                    }
                    finally { if (item != null) Marshal.ReleaseComObject(item); }
                }

                IFileDialogCustomize customize = (IFileDialogCustomize)dialog;
                customize.AddPushButton(SelectControl, "选择");
                customize.MakeProminent(SelectControl);
                dialog.Advise(events, out cookie);
                int result = dialog.Show(IllustratorOwner());
                if (result == Cancelled) return null;
                if (result < 0) Marshal.ThrowExceptionForHR(result);
                // The normal Open button commits GetResults(), including a
                // filename typed into the edit box. Custom Select captures
                // folders before Close(), where GetResults() is unavailable.
                List<string> accepted = events.Paths;
                if (accepted == null || accepted.Count == 0) accepted = ConfirmedFiles(dialog);
                if (accepted.Count == 0) throw new InvalidDataException("没有取得已确认的图片，请重新选择。");
                return accepted;
            }
            finally
            {
                if (cookie != 0) dialog.Unadvise(cookie);
                Marshal.ReleaseComObject(dialog);
                GC.KeepAlive(events);
            }
        }

        private static IntPtr IllustratorOwner()
        {
            foreach (Process process in Process.GetProcessesByName("Illustrator"))
            {
                try { if (process.MainWindowHandle != IntPtr.Zero) return process.MainWindowHandle; }
                catch (InvalidOperationException) { }
                finally { process.Dispose(); }
            }
            return IntPtr.Zero;
        }

        private static bool Supported(string path)
        {
            string extension = Path.GetExtension(path).ToLowerInvariant();
            return "|.jpg|.jpeg|.png|.tif|.tiff|.psd|.bmp|.gif|.webp|.pdf|.ai|.eps|"
                .IndexOf("|" + extension + "|", StringComparison.Ordinal) >= 0;
        }

        private static string ShellPath(IShellItem item)
        {
            IntPtr value;
            item.GetDisplayName(0x80058000, out value); // SIGDN_FILESYSPATH
            try { return Marshal.PtrToStringUni(value); }
            finally { Marshal.FreeCoTaskMem(value); }
        }

        private static List<string> ConfirmedFiles(IFileOpenDialog dialog)
        {
            List<string> paths = new List<string>();
            IShellItemArray items = null;
            try
            {
                // GetResults is valid in OnFileOk and after a successful Show.
                // https://learn.microsoft.com/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifileopendialog-getresults
                dialog.GetResults(out items);
                uint count;
                items.GetCount(out count);
                for (uint i = 0; i < count; i++)
                {
                    IShellItem item;
                    items.GetItemAt(i, out item);
                    try
                    {
                        string path = ShellPath(item);
                        if (File.Exists(path) && Supported(path)) paths.Add(path);
                    }
                    finally { Marshal.ReleaseComObject(item); }
                }
            }
            finally { if (items != null) Marshal.ReleaseComObject(items); }
            return paths;
        }

        private static List<string> SelectedPaths(IFileOpenDialog dialog, bool useCurrentFolder)
        {
            List<string> paths = new List<string>();
            IShellItemArray items = null;
            try
            {
                dialog.GetSelectedItems(out items);
                uint count;
                items.GetCount(out count);
                for (uint i = 0; i < count; i++)
                {
                    IShellItem item;
                    items.GetItemAt(i, out item);
                    try
                    {
                        string path = ShellPath(item);
                        if (Directory.Exists(path) || (File.Exists(path) && Supported(path)))
                            paths.Add(path);
                    }
                    finally { Marshal.ReleaseComObject(item); }
                }
            }
            catch (COMException) { }
            finally { if (items != null) Marshal.ReleaseComObject(items); }

            if (paths.Count == 0 && useCurrentFolder)
            {
                string fileName = "";
                try { dialog.GetFileName(out fileName); } catch (COMException) { }
                // Do not silently use the current folder if the user typed
                // an invalid or unsupported file name.
                if (String.IsNullOrWhiteSpace(fileName))
                {
                    IShellItem folder;
                    dialog.GetFolder(out folder);
                    try
                    {
                        string path = ShellPath(folder);
                        if (Directory.Exists(path)) paths.Add(path);
                    }
                    finally { Marshal.ReleaseComObject(folder); }
                }
            }
            return paths;
        }

        [ComVisible(true), ClassInterface(ClassInterfaceType.None)]
        public sealed class SelectionEvents : IFileDialogEvents, IFileDialogControlEvents
        {
            private readonly IFileOpenDialog dialog;
            private bool shown;
            internal List<string> Paths;
            internal SelectionEvents(IFileOpenDialog value) { dialog = value; }

            public int OnFileOk(IFileOpenDialog value)
            {
                try { Paths = ConfirmedFiles(value); }
                catch (COMException) { Paths = null; }
                return 0;
            }
            public int OnFolderChanging(IFileOpenDialog value, IShellItem folder) { return 0; }
            private void EnsureVisible()
            {
                if (shown) return;
                try
                {
                    IntPtr window;
                    ((IOleWindow)dialog).GetWindow(out window);
                    if (window != IntPtr.Zero)
                    {
                        // A CEP-launched process may inherit a hidden startup
                        // state. The selection dialog itself must be visible.
                        ShowWindow(window, 5);
                        ShowWindow(window, 5);
                        SetForegroundWindow(window);
                        shown = true;
                    }
                }
                catch (COMException) { }
            }
            public int OnFolderChange(IFileOpenDialog value) { EnsureVisible(); return 0; }
            public int OnSelectionChange(IFileOpenDialog value) { EnsureVisible(); return 0; }
            public int OnShareViolation(IFileOpenDialog value, IShellItem item, out uint response) { response = 0; return 0; }
            public int OnTypeChange(IFileOpenDialog value) { return 0; }
            public int OnOverwrite(IFileOpenDialog value, IShellItem item, out uint response) { response = 0; return 0; }
            public int OnItemSelected(IFileDialogCustomize value, uint control, uint item) { return 0; }
            public int OnButtonClicked(IFileDialogCustomize value, uint control)
            {
                if (control == SelectControl)
                {
                    List<string> selected = SelectedPaths(dialog, true);
                    if (selected.Count != 0)
                    {
                        Paths = selected;
                        dialog.Close(0);
                    }
                }
                return 0;
            }
            public int OnCheckButtonToggled(IFileDialogCustomize value, uint control, bool valueChecked) { return 0; }
            public int OnControlActivating(IFileDialogCustomize value, uint control) { return 0; }
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct FilterSpec
        {
            [MarshalAs(UnmanagedType.LPWStr)] internal string Name;
            [MarshalAs(UnmanagedType.LPWStr)] internal string Spec;
        }

        [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
        private class FileOpenDialog { }

        [ComImport, Guid("D57C7288-D4AD-4768-BE02-9D969532D960"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IFileOpenDialog
        {
            [PreserveSig] int Show(IntPtr parent);
            void SetFileTypes(uint count, [MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 0)] FilterSpec[] filters);
            void SetFileTypeIndex(uint index);
            void GetFileTypeIndex(out uint index);
            void Advise(IFileDialogEvents events, out uint cookie);
            void Unadvise(uint cookie);
            void SetOptions(uint options);
            void GetOptions(out uint options);
            void SetDefaultFolder(IShellItem item);
            void SetFolder(IShellItem item);
            void GetFolder(out IShellItem item);
            void GetCurrentSelection(out IShellItem item);
            void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
            void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
            void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
            void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
            void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
            void GetResult(out IShellItem item);
            void AddPlace(IShellItem item, int alignment);
            void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string extension);
            void Close(int result);
            void SetClientGuid(ref Guid guid);
            void ClearClientData();
            void SetFilter(IntPtr filter);
            void GetResults(out IShellItemArray items);
            void GetSelectedItems(out IShellItemArray items);
        }

        [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IShellItem
        {
            void BindToHandler(IntPtr context, ref Guid handler, ref Guid iid, out IntPtr result);
            void GetParent(out IShellItem parent);
            void GetDisplayName(uint kind, out IntPtr name);
            void GetAttributes(uint mask, out uint attributes);
            void Compare(IShellItem other, uint hint, out int order);
        }

        [ComImport, Guid("00000114-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IOleWindow
        {
            void GetWindow(out IntPtr window);
            void ContextSensitiveHelp([MarshalAs(UnmanagedType.Bool)] bool value);
        }

        [ComImport, Guid("B63EA76D-1F85-456F-A19C-48159EFA858B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IShellItemArray
        {
            void BindToHandler(IntPtr context, ref Guid handler, ref Guid iid, out IntPtr result);
            void GetPropertyStore(int flags, ref Guid iid, out IntPtr result);
            void GetPropertyDescriptionList(IntPtr key, ref Guid iid, out IntPtr result);
            void GetAttributes(uint flags, uint mask, out uint attributes);
            void GetCount(out uint count);
            void GetItemAt(uint index, out IShellItem item);
            void EnumItems(out IntPtr items);
        }

        [ComVisible(true), Guid("973510DB-7D7F-452B-8975-74A85828D354"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IFileDialogEvents
        {
            [PreserveSig] int OnFileOk(IFileOpenDialog dialog);
            [PreserveSig] int OnFolderChanging(IFileOpenDialog dialog, IShellItem folder);
            [PreserveSig] int OnFolderChange(IFileOpenDialog dialog);
            [PreserveSig] int OnSelectionChange(IFileOpenDialog dialog);
            [PreserveSig] int OnShareViolation(IFileOpenDialog dialog, IShellItem item, out uint response);
            [PreserveSig] int OnTypeChange(IFileOpenDialog dialog);
            [PreserveSig] int OnOverwrite(IFileOpenDialog dialog, IShellItem item, out uint response);
        }

        [ComVisible(true), Guid("36116642-D713-4B97-9B83-7484A9D00433"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IFileDialogControlEvents
        {
            [PreserveSig] int OnItemSelected(IFileDialogCustomize dialog, uint control, uint item);
            [PreserveSig] int OnButtonClicked(IFileDialogCustomize dialog, uint control);
            [PreserveSig] int OnCheckButtonToggled(IFileDialogCustomize dialog, uint control, [MarshalAs(UnmanagedType.Bool)] bool value);
            [PreserveSig] int OnControlActivating(IFileDialogCustomize dialog, uint control);
        }

        [ComImport, Guid("E6FDD21A-163F-4975-9C8C-A69F1BA37034"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        public interface IFileDialogCustomize
        {
            void EnableOpenDropDown(uint control);
            void AddMenu(uint control, [MarshalAs(UnmanagedType.LPWStr)] string label);
            void AddPushButton(uint control, [MarshalAs(UnmanagedType.LPWStr)] string label);
            void AddComboBox(uint control);
            void AddRadioButtonList(uint control);
            void AddCheckButton(uint control, [MarshalAs(UnmanagedType.LPWStr)] string label, [MarshalAs(UnmanagedType.Bool)] bool value);
            void AddEditBox(uint control, [MarshalAs(UnmanagedType.LPWStr)] string text);
            void AddSeparator(uint control);
            void AddText(uint control, [MarshalAs(UnmanagedType.LPWStr)] string text);
            void SetControlLabel(uint control, [MarshalAs(UnmanagedType.LPWStr)] string label);
            void GetControlState(uint control, out uint state);
            void SetControlState(uint control, uint state);
            void GetEditBoxText(uint control, [MarshalAs(UnmanagedType.LPWStr)] out string text);
            void SetEditBoxText(uint control, [MarshalAs(UnmanagedType.LPWStr)] string text);
            void GetCheckButtonState(uint control, [MarshalAs(UnmanagedType.Bool)] out bool value);
            void SetCheckButtonState(uint control, [MarshalAs(UnmanagedType.Bool)] bool value);
            void AddControlItem(uint control, uint item, [MarshalAs(UnmanagedType.LPWStr)] string label);
            void RemoveControlItem(uint control, uint item);
            void RemoveAllControlItems(uint control);
            void GetControlItemState(uint control, uint item, out uint state);
            void SetControlItemState(uint control, uint item, uint state);
            void GetSelectedControlItem(uint control, out uint item);
            void SetSelectedControlItem(uint control, uint item);
            void StartVisualGroup(uint control, [MarshalAs(UnmanagedType.LPWStr)] string label);
            void EndVisualGroup();
            void MakeProminent(uint control);
            void SetControlItemText(uint control, uint item, [MarshalAs(UnmanagedType.LPWStr)] string text);
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
        private static extern void SHCreateItemFromParsingName(
            [MarshalAs(UnmanagedType.LPWStr)] string path, IntPtr context, ref Guid iid,
            [MarshalAs(UnmanagedType.Interface)] out IShellItem item);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr window, int command);
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr window);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr awareness);
        [DllImport("shcore.dll")]
        private static extern int SetProcessDpiAwareness(int awareness);
        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetProcessDPIAware();
    }
}
