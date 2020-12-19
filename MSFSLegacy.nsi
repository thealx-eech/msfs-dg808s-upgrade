;NSIS Modern User Interface

  Unicode True

;--------------------------------
;Include Modern UI
  !include "MUI2.nsh"
;HASH plugin to make unique folder name
  !include "LogicLib.nsh"
  !include "Sections.nsh"
  ;--------------------------------
;General
	
  !define AIRPLANEID "dg808s"
  !define FSXAIRPLANEID "DG808S"
  !define VERSION "0.5"
  !define BLDDIR "J:\MSFS2020\MSFS MODS\DG808S\"
  !define SHDDIR "${BLDDIR}aircraft\"

  ;Name and file
  Name "MSFS Legacy DG Flugzeugbau DG-808S ver${VERSION}"
  OutFile "MSFS_Legacy_${FSXAIRPLANEID}_${VERSION}.exe"
  SetCompressor lzma

  InstallDir ""
  ;Request application privileges for Windows Vista
  ;RequestExecutionLevel admin

  !define MUI_ABORTWARNING
  


DirText "" "" "Browse" ""
!define MUI_ICON "${BLDDIR}icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${BLDDIR}InstallerLogo.bmp"
!define MUI_HEADERIMAGE_RIGHT

;FSX PAGE
Var fsxDir
Var msfsDir

Function .onInit
	SetRegView 32
	ReadRegStr $fsxDir HKLM "Software\Microsoft\Microsoft Games\Flight Simulator\10.0\" "AppPath"
	${If} ${Errors}
		ReadRegStr $fsxDir HKLM "SOFTWARE\Microsoft\microsoft games\Flight Simulator\10.0\" "SetupPath"
	${EndIf}

	SetRegView 64
	ReadRegStr $msfsDir HKLM "Software\Microsoft\Microsoft Games\Flight Simulator\11.0\" "CommunityPath"
FunctionEnd

!define MUI_COMPONENTSPAGE_TEXT_TOP "Latest updates and news about this project you can find at:$\r$\nFB Group MS Flight Simulator Gliders$\r$\nWebsite msfs.touching.cloud"
!insertmacro MUI_PAGE_COMPONENTS


;SOURCE PAGE START
!define MUI_DIRECTORYPAGE_VARIABLE $fsxDir
!define MUI_PAGE_HEADER_TEXT "Source directory"
!define MUI_PAGE_HEADER_SUBTEXT ""
!define MUI_DIRECTORYPAGE_TEXT_TOP "This Legacy MSFS2020 add-on require Microsoft Flight Simulator X to be installed. Please select FSX installation path if it was not read from registry correctly"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Microsoft Flight Simulator X installation path"

!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipPage
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE "SourceDirLeave"
!insertmacro MUI_PAGE_DIRECTORY
;SOURCE PAGE END

;MSFS PAGE START
!define MUI_DIRECTORYPAGE_VARIABLE $msfsDir

!define MUI_PAGE_HEADER_TEXT "Destination directory"
!define MUI_PAGE_HEADER_SUBTEXT ""
!define MUI_DIRECTORYPAGE_TEXT_TOP "Please set HLM_Packages > Community folder path of Microsoft Flight Simulator 2020 where add-on will be installed"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Select Microsoft Flight Simulator 2020 HLM_Packages > Community folder"

;!define MUI_PAGE_CUSTOMFUNCTION_LEAVE "DestinationDirLeave"
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE "DestinationDirLeave"
!insertmacro MUI_PAGE_DIRECTORY
;MSFS PAGE END

  ;--------------------------------
;Languages
 
  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections

Page instfiles

Section "New install" sectionInstall

	;COPY FSX FILES
	CopyFiles "$fsxDir\SimObjects\Airplanes\${FSXAIRPLANEID}\*" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}"

	;DELETE FSX FILES
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\*.*"
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\Soundai\*.*"
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\DG808S.air"
	RMDir /R "$msfsDir\${AIRPLANEID}_CVT_\"

	;COPY ASOBOPCK
	CopyFiles "$msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"
	CopyFiles "$msfsDir\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$msfsDir\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"
	
	;COPY ADD ON FILES
	SetOutPath "$msfsDir\${AIRPLANEID}"
	File /r "${SHDDIR}"

	;COPY JSON GEN
	SetOutPath "$msfsDir\"
	File "${BLDDIR}\JSONgen\msfsJSONgen.exe"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\${AIRPLANEID}"'

	;RUN JSON GEN
	SetOutPath "$msfsDir\"
	File /r "${BLDDIR}\gauges\"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\legacy-vcockpits-instruments"'
	
	;MISSING PCK WARNING
	IfFileExists "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\Asobo_VL3.PC.PCK" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"File $msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK does not exists. Aircraft sounds will not work.."

SectionEnd

Section /o "Update" sectionUpdate

	;DELETE FSX FILES
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\*.*"
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\Soundai\*.*"
	Delete "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\DG808S.air"
	RMDir /R "$msfsDir\${AIRPLANEID}_CVT_\"

	;COPY ASOBOPCK
	CopyFiles "$msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"
	CopyFiles "$msfsDir\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$msfsDir\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"
	
	;COPY ADD ON FILES
	SetOutPath "$msfsDir\${AIRPLANEID}"
	File /r "${SHDDIR}"

	;COPY JSON GEN
	SetOutPath "$msfsDir\"
	File "${BLDDIR}\JSONgen\msfsJSONgen.exe"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\${AIRPLANEID}"'

	;RUN JSON GEN
	SetOutPath "$msfsDir\"
	File /r "${BLDDIR}\gauges\"
	Exec '"$msfsDir\msfsJSONgen.exe" "$msfsDir\legacy-vcockpits-instruments"'
	
	;MISSING PCK WARNING
	IfFileExists "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\Asobo_VL3.PC.PCK" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"File $msfsDir\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK does not exists. Aircraft sounds will not work.."

SectionEnd

Section "Show readme" sectionReadme
	ExecShell "open" "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\readme.txt"
SectionEnd

Function .onSelChange
!insertmacro StartRadioButtons $1
    !insertmacro RadioButton ${sectionInstall}
    !insertmacro RadioButton ${sectionUpdate}
!insertmacro EndRadioButtons
FunctionEnd

Function SkipPage
	${If} ${SectionIsSelected} ${sectionUpdate}
	Abort
	${EndIf}
FunctionEnd

Function SourceDirLeave
	IfFileExists "$fsxDir\SimObjects\Airplanes\${FSXAIRPLANEID}\*.*" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"Folder $fsxDirSimObjects\Airplanes\${FSXAIRPLANEID}\ does not exists. You can't install this add-on without Microsoft Flight Simulator X files."
	Abort
FunctionEnd

Function DestinationDirLeave
	${If} ${SectionIsSelected} ${sectionUpdate}
	IfFileExists "$msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\*.*" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"Folder $msfsDir\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\ does not exists. You can't install this add-on without Microsoft Flight Simulator X files."
	Abort
	${EndIf}
FunctionEnd

;--------------------------------
;Descriptions

  ;Language strings
  LangString DESC_sectionInstall ${LANG_ENGLISH} "Import sources from Flight Simulator X (it should be installed)"
  LangString DESC_sectionUpdate ${LANG_ENGLISH} "Update imported aircraft (inside of MSFS Community folder!)"
  LangString DESC_sectionReadme ${LANG_ENGLISH} "Show readme file on installation complete"

  ;Assign language strings to sections
  !insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${sectionInstall} $(DESC_sectionInstall)
    !insertmacro MUI_DESCRIPTION_TEXT ${sectionUpdate} $(DESC_sectionUpdate)
  !insertmacro MUI_FUNCTION_DESCRIPTION_END

;--------------------------------
