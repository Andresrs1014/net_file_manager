[Setup]
AppName=NetVault
AppVersion=1.0.0
AppPublisher=Andres Quintero
AppPublisherURL=https://github.com/Andresrs1014/net_file_manager
DefaultDirName={autopf}\NetVault
DefaultGroupName=NetVault
OutputDir=installer
OutputBaseFilename=NetVault_Installer
SetupIconFile=assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear icono en el escritorio"; GroupDescription: "Iconos adicionales:"

[Files]
Source: "dist\NetVault.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json";       DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*";          DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\NetVault";              Filename: "{app}\NetVault.exe"
Name: "{group}\Desinstalar NetVault";  Filename: "{uninstallexe}"
Name: "{commondesktop}\NetVault";      Filename: "{app}\NetVault.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\NetVault.exe"; Description: "Abrir NetVault"; Flags: nowait postinstall skipifsilent
