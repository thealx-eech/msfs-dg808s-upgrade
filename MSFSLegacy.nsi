;NSIS Modern User Interface

  Unicode True

;--------------------------------
;Include Modern UI
  !include "MUI2.nsh"
;HASH plugin to make unique folder name
  !include "LogicLib.nsh"
  ;--------------------------------
;General
	
  !define AIRPLANEID "dg808s"
  !define FSXAIRPLANEID "DG808S"
  !define VERSION "0.1"
  !define BLDDIR "J:\MSFS2020\MSFS MODS\DG808S\"
  !define SHDDIR "${BLDDIR}aircraft"

  ;Name and file
  Name "MSFS Legacy DG Flugzeugbau DG-808S ver${VERSION}"
  OutFile "MSFS_Legacy_${FSXAIRPLANEID}_${VERSION}.exe"
  SetCompressor lzma

  InstallDir ""
  ;Request application privileges for Windows Vista
  RequestExecutionLevel admin

  Var WinDate


;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING
;--------------------------------
;Pages
;  !insertmacro MUI_PAGE_LICENSE "${NSISDIR}\Docs\Modern UI\License.txt"
; !insertmacro MUI_PAGE_COMPONENTS

DirText "" "" "Browse" ""
!define MUI_ICON "${BLDDIR}icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${BLDDIR}InstallerLogo.bmp"
!define MUI_HEADERIMAGE_RIGHT

;FSX PAGE
Var fsxDir
Var msfsDir

!define MUI_DIRECTORYPAGE_VARIABLE $fsxDir

function .onInit

	SetRegView 32
	ReadRegStr $fsxDir HKLM "Software\Microsoft\Microsoft Games\Flight Simulator\10.0\" "AppPath"
	${If} ${Errors}
		ReadRegStr $fsxDir HKLM "SOFTWARE\Microsoft\microsoft games\Flight Simulator\10.0\" "SetupPath"
	${EndIf}

	SetRegView 64
	ReadRegStr $WinDate HKLM "Software\Microsoft\Windows NT\CurrentVersion\" "InstallDate"

	ReadRegStr $msfsDir HKLM "Software\Microsoft\Microsoft Games\Flight Simulator\11.0\" "CommunityPath"
	
functionend

!define MUI_COMPONENTSPAGE_TEXT_TOP "Check/Uncheck what aircraft components you want to install."
!insertmacro MUI_PAGE_COMPONENTS

!define MUI_PAGE_HEADER_TEXT "Source directory"
!define MUI_PAGE_HEADER_SUBTEXT ""
!define MUI_DIRECTORYPAGE_TEXT_TOP "This Legacy MSFS2020 add-on require Microsoft Flight Simulator X to be installed. Please select FSX installation path if it was not read from registry correctly"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Microsoft Flight Simulator X installation path"

!define MUI_PAGE_CUSTOMFUNCTION_LEAVE "SourceDirLeave"
!insertmacro MUI_PAGE_DIRECTORY

Function SourceDirLeave

	IfFileExists "$fsxDir\SimObjects\Airplanes\${FSXAIRPLANEID}\*.*" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"Folder $fsxDirSimObjects\Airplanes\${FSXAIRPLANEID}\ does not exists. You can't install this add-on without Microsoft Flight Simulator X files."
	Abort

FunctionEnd

;MSFS PAGE
!define MUI_DIRECTORYPAGE_VARIABLE $msfsDir

!define MUI_PAGE_HEADER_TEXT "Destination directory"
!define MUI_PAGE_HEADER_SUBTEXT ""
!define MUI_DIRECTORYPAGE_TEXT_TOP "Please set HLM_Packages > Community folder path of Microsoft Flight Simulator 2020 where add-on will be installed"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Select Microsoft Flight Simulator 2020 HLM_Packages > Community folder"

!define MUI_PAGE_CUSTOMFUNCTION_LEAVE "DestinationDirLeave"
!insertmacro MUI_PAGE_DIRECTORY
  
Function DestinationDirLeave

;	SetRegView 64
;	WriteRegStr HKLM "SOFTWARE\Microsoft\microsoft games\Flight Simulator\11.0\" "CommunityPath" $msfsDir

FunctionEnd
  
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_SHOWREADME_CHECKED
!define MUI_FINISHPAGE_SHOWREADME $msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\readme.txt

!insertmacro MUI_PAGE_FINISH

  ;--------------------------------
;Languages
 
  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections

Page instfiles

Section "Aircraft" sectionAircraft

	CopyFiles "$fsxDir\SimObjects\Airplanes\${FSXAIRPLANEID}\*" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}"

	SetOutPath "$msfsDir\${AIRPLANEID}\"
	File "${SHDDIR}\manifest.json"

	SetOutPath "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\"
	File /r "${SHDDIR}\SimObjects\Airplanes\${FSXAIRPLANEID}\"

	SetOutPath "$msfsDir\"
	File "${BLDDIR}\JSONgen\msfsJSONgen.exe"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\${AIRPLANEID}"'

SectionEnd

Section "Gauges" sectionGauges

	SetOutPath "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\panel\"
	File "${SHDDIR}\SimObjects\Airplanes\${FSXAIRPLANEID}\panel\panel.cfg"

	SetOutPath "$msfsDir\"
	File /r "${BLDDIR}\gauges\"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\legacy-vcockpits-instruments"'

SectionEnd

;--------------------------------
;Descriptions

  ;Language strings
  LangString DESC_sectionAircraft ${LANG_ENGLISH} "Install FSX Legacy aircraft"
  LangString DESC_sectionGauges ${LANG_ENGLISH} "Install gauges for this aircraft (into legacy-vcockpits-instruments)"

  ;Assign language strings to sections
  !insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${sectionAircraft} $(DESC_sectionAircraft)
    !insertmacro MUI_DESCRIPTION_TEXT ${sectionGauges} $(DESC_sectionGauges)
  !insertmacro MUI_FUNCTION_DESCRIPTION_END

;--------------------------------
