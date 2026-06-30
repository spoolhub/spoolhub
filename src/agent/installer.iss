#define MyAppName "SpoolHub Agent"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "SpoolHub"
#define MyAppURL "https://github.com/spoolhub/spoolhub"
#define MyAppExeName "SpoolHubAgent.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={localappdata}\SpoolHubAgent
DisableProgramGroupPage=yes
DisableDirPage=yes
OutputBaseFilename=SpoolHubAgent-Setup
Compression=lzma
SolidCompression=yes
; No admin required — installs to %LocalAppData%
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "SpoolHubAgent\publish\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; Auto-start on Windows login (per-user, no admin needed)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "SpoolHubAgent"; \
  ValueData: """{app}\{#MyAppExeName}"""; \
  Flags: uninsdeletevalue

[Run]
; Launch agent silently after install — user sees nothing, it just starts
Filename: "{app}\{#MyAppExeName}"; Flags: nowait postinstall; \
  Description: "Start SpoolHub Agent now"

[UninstallRun]
; Kill the agent before uninstall
Filename: "taskkill"; Parameters: "/F /IM {#MyAppExeName}"; \
  Flags: runhidden; RunOnceId: "KillAgent"
