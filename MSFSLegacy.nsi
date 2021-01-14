;NSIS Modern User Interface

;--------------------------------
;Include Modern UI

	!include "MUI2.nsh"

;--------------------------------
;General

	;define these variable
  !define AIRPLANEID "dg808s"
  !define FSXAIRPLANEID "DG808S"
  !define VERSION "0.6"
  !define BLDDIR "J:\MSFS2020\MSFS MODS\DG808S\DG808S upgrade\"
  !define SHDDIR "${BLDDIR}aircraft\"

	;Name and file
  Name "MSFS Legacy DG Flugzeugbau DG-808S ver${VERSION}"
  OutFile "MSFS_Legacy_${FSXAIRPLANEID}_${VERSION}.exe"
  SetCompressor lzma

	;Default installation folder
	InstallDir "C:\Microsoft Flight Simulator\HLM_Packages\Community"

	;Get installation folder from registry if available
	InstallDirRegKey HKLM "Software\Microsoft\Microsoft Games\Flight Simulator\11.0\" "INSTALLATION PATH"

;--------------------------------
;Interface Settings

	!define MUI_ABORTWARNING

;--------------------------------
;Pages
	!define MUI_ICON "${BLDDIR}icon.ico"
	!define MUI_HEADERIMAGE
	!define MUI_HEADERIMAGE_BITMAP "${BLDDIR}InstallerLogo.bmp"
	!define MUI_HEADERIMAGE_RIGHT

		!define MUI_COMPONENTSPAGE_TEXT_TOP "Latest updates and news about our add-ons you can find at:$\r$\nFB Group > MS Flight Simulator Gliders$\r$\nWebsite https://msfs.touching.cloud"
	!insertmacro MUI_PAGE_COMPONENTS
		!define MUI_DIRECTORYPAGE_TEXT_TOP "Select Microsoft Flight Simulator 2020 HLM_Packages > Community folder. This installer will place the files in the correct directories."
	!insertmacro MUI_PAGE_DIRECTORY
	!insertmacro MUI_PAGE_INSTFILES
		!define MUI_FINISHPAGE_NOAUTOCLOSE
		!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\readme.txt"
	!insertmacro MUI_PAGE_FINISH

	ShowInstDetails show
;--------------------------------
;Languages

	!insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections
Section "Remove legacy files" SectionINI

	RMDir /R "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	RMDir /R "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\Soundai\"
	Delete "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\DG808S.air"
	RMDir /R "$INSTDIR\${AIRPLANEID}_CVT_\"

SectionEnd

Section "Aircraft files" SectionSystem

	;COPY JSON GEN
	SetOutPath "$INSTDIR\"
	File "${BLDDIR}\JSONgen\msfsJSONgen.exe"

	SetOutPath "$INSTDIR\${AIRPLANEID}"
	File /r "${SHDDIR}"

	CopyFiles "$INSTDIR\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$INSTDIR\..\Official\OneStore\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"
	CopyFiles "$INSTDIR\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK" "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\"
	CopyFiles "$INSTDIR\..\Official\Steam\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK" "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\soundai\"

	Exec '"$INSTDIR\msfsJSONgen.exe" "$INSTDIR\${AIRPLANEID}"'

	;MISSING PCK WARNING
	IfFileExists "$INSTDIR\${AIRPLANEID}\SimObjects\Airplanes\${FSXAIRPLANEID}\sound\Asobo_VL3.PC.PCK" +3 0
	MessageBox MB_ICONEXCLAMATION \
	"File \asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK does not exists. Aircraft sounds will not work, contact mod authors or community members about this issue."
SectionEnd

Section "cockpit gauges" Section1161Dyn

	SetOutPath "$INSTDIR\"
	File /r "${BLDDIR}\gauges\"

	Exec '"$INSTDIR\msfsJSONgen.exe" "$INSTDIR\legacy-vcockpits-instruments"'

SectionEnd

;--------------------------------
;Descriptions

	;Language strings
	LangString DESC_SectionLegacy ${LANG_ENGLISH} "Remove legacy files if aircraft already imported (AIR file, WAV sound samples)"
	LangString DESC_SectionAircraft ${LANG_ENGLISH} "Main aircraft files - models, textures and configs"
	LangString DESC_SectionGauges ${LANG_ENGLISH} "Cockpit gauge scripts. Can be unchecked if you are installing this aircraft only for it appearance in multiplayer game."

	;Assign language strings to sections
	!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
	!insertmacro MUI_DESCRIPTION_TEXT ${SectionSystem} $(DESC_SectionAircraft)
	!insertmacro MUI_DESCRIPTION_TEXT ${Section1161Dyn} $(DESC_SectionGauges)
	!insertmacro MUI_DESCRIPTION_TEXT ${SectionINI} $(DESC_SectionLegacy)
	!insertmacro MUI_FUNCTION_DESCRIPTION_END
;--------------------------------
