Microsoft Flight Simulator © Microsoft Corporation. DG Flugzeugbau DG-808S MSFS add-on was created under Microsoft's "Game Content Usage Rules" using assets from Microsoft Flight Simulator X, and it is not endorsed by or affiliated with Microsoft.

https://www.xbox.com/en-US/developers/rules


This add-on contain various improvements like modern flight model, upgraded gauges, replaced sounds, updated textures.
Further work will be continued to bring better gauges functionality, visual quality and realistic flight performance.

If you are going to use this glider in VR mode, choose "VR" livery in hangar before you get inside of the cockpit or game will crash to desktop. Otherwise, avoid using VR liveries as they contain some issues - wrong surfaces parameters, missing landing gear.

HOW TO INSTALL

Automatic installer contain most of required files, so only thing you need to do is select Community path. Exceptions are sound packages - we can't include any sounds into installer as it will be Microsoft policy violation,  so they will be copied by installer from default MSFS aircraft automatically.

    Unpack and launch MSFS_Legacy_DG808S_#.exe file
    Launch installer and choose required option
    Press Next button
    Select Community path (if you have problems with that - read this article https://www.flightsim.com/vbfs/content.php?21235-Finding-The-MSFS-2020-Community-Folder ). You can't install add-on in some other folder, or installer will be not able to find file Asobo_VL3.PC.PCK (you will need to copy it into \sound\ manually in this case).
    Press Install, installation process will started
    After installation finished, you can open Readme file
    Launch the game, if all files copied properly, you will find DG808S in the list of your aircraft. Switch to VR livery first of all if you are using VR.

If you have problems with automatic installer, you can unpack files manually, then perform these actions manually:

    delete sound.cfg files from folder \sound\ and \soundai\
    delete DG808S.air file if it exists
    copy file \Official\[OneStore or Steam]\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\sound\Asobo_VL3.PC.PCK into \sound\ folder
    copy file Official\[OneStore or Steam]\asobo-aircraft-vl3\SimObjects\Airplanes\Asobo_VL3\soundai\Asobo_VL3_AI.PC.PCK into \soundai\ folder

HOW TO UNINSTALL

    Launch installer
    Uncheck all options except first one "Remove previous version"
    Select Community folder
    Press "Install" button


NOTES AND ISSUES

EXE file of this installer is unsigned, so Windows Defender/some other antivirus software may be triggered. Each update build will be submit into Microsoft Security Intelligence service to make sure it will be not blocked by Windows Defender, but it take days until cloud database, and then your client, will be updated. If you experience such issue – you may try to apply security intelligence manual update following this instruction https://www.microsoft.com/en-us/wdsi/defenderupdates and then try to run application again.

If you experience "Too long filename" error in installation process, or your Community folder is inside of USERS directory (and as result has really long path name), first of all check that LongPathsEnabled value is equal to "1" in your windows registry https://www.howtogeek.com/266621/how-to-make-windows-10-accept-file-paths-over-260-characters/  Or you can try to follow manual installation instructions.

Remove fuel right after game start if you don't need it, or increase amount from 50% to 100%.

If you experience visual issues with yaw string, switch antialiasing settings from TAA to different one.

If you want to disable vario tone, use Alt+A shortkey

VR model (for VR liveries) contain some visual issues (missing polygons at the back face of the panel, landing gear without animation) so avoid using them in normal game mode. However, if you met someone with active VR, you will see these issues on that player anyway



LIST OF CONFIG FILES CHANGES

by Michael Rossi

[WEIGHT_AND_BALANCE]

empty_weight = 772 ; (pounds)
empty_weight_cg_position = -2.2693, 0.0, 0.00 ; -1.93 (feet) longitudinal, lateral, vertical distance from specified datum

station_load.0 = 170, 1, 0, -0.5, TT:MENU.PAYLOAD.PILOT, 1
station_load.1 = 0, 4.6797, 0, 0, TT:FRONT BALLAST
station_load.2 = 0, -1.6797, 0, 0, TT:CG BALLAST
station_load.3 = 0, -7.6797, 0, 0, TT:REAR BALLAST

[FLIGHT_TUNING]
cruise_lift_scalar = 2 ;
parasite_drag_scalar = 0.5 ;
induced_drag_scalar = 0.5 ;
elevator_effectiveness = 1.0 ;
aileron_effectiveness = 2.0 ;
rudder_effectiveness = 1.0 ;

[FLAPS.0]
lift_scalar = 2 ; Scalar coefficient to ponderate global flap lift coef (non dimensioned)
drag_scalar = 0.5 ; Scalar coefficient to ponderate global flap drag coef (non dimensioned)

If you also convert the [AERODYNAMICS] section you must correct the aero_center_lift value which must be (negative) approximately 1/4 of the wing_root_chord variable - IF wing_root_chord = 3.03 ; Feet

[AERODYNAMICS]

aero_center_lift = -0.75 ; -9.5 Init to center CA

ENGINE - Inserted jet engines, to simulate a towing plane, with only 1 gallon of petrol, if you don't want to use this function just put 0 in the tank variable

[FUEL]
Center1 = -1.6797, 0, 0, 1, 0 ; For each tank: Tank position (z longitudinal, x lateral, y vertical) (FEET), total fuel capacity (GALLONS), unusable fuel capacity (GALLONS)

Edited the file - runway.flt - to have the engine ready when you start from the ground and with the brakes already off

SOUND - Used the new MSFS sound of Asobo_VL3.
Inserted the vario sound in the original file - sound.xml - and removed the engine sound, leaving only a sound when the fuel runs out and the engine is switched off, to simulate the sound, of towing release.

TEXTURE - Texture changed - dg808s_t.dds - in the position of the glass, to solve the invisible glass problem from the outside view



UPGRADE INSTRUMENTS DETAILS

by Ian "B21" Lewis

##############################
# DG808S B21 Instruments v.44

# SUMMARY USAGE:
##############

The instruments will work fine "out-of-the-box" with the Cambridge Vario auto-switching between CRUISE and CLIMB modes.

HOT-KEYS:

Assign a key/button to "TOGGLE BEACON LIGHTS" to manually switch the Cambridge vario to CRUISE or CLIMB.

Assign a key/button to "TOGGLE NAV LIGHTS" (default "Alt-N"?) to select NEXT WAYPOINT in Nav Display (if you have a flightplan loaded).

Assign a key to "TOGGLE CABIN LIGHTS" (default "Alt-T" I think) to show/hide debug readings.

#########################################
# Nav Instrument / LOADING A FLIGHT PLAN
#########################################

The Nav Instrument tells you
* the name of the selected waypoint
* a pointer for the direction to go
* the altitude of the waypoint
* the distance (in Km) to go

Flight plans are not essential, but we can use them to define a soaring cross-country task.

If you start the flight with no flight plan loaded, the Nav instrument will populate a single waypoint for your starting position,
calling that 'HOME'. This isn't a bad place to start with a launch followed by a glide back to the airport following the Nav
pointer, including in a cross-wind.

If you load a flight plan (before starting the flight) then the Nav Instrument will read that and display the first waypoint. You can
select further waypoints via the hot-key/button assigned to "TOGGLE NAV LIGHTS" (default Alt-N).

You can use 'Alt-N' (by default) to step through each waypoint on the Nav Instrument. Technically in MSFS you are toggling the
Nav lights but this is a workaround to enable you to interact with the Nav Instrument.

You can create your own MSFS flight plan with Little Nav Map (or Plan G).

MSFS has it's own idea for what to do with the ALTITUDES
in your flight plan and this makes those altitudes irrelevant for soaring. If you append "+<altitude feet>" to your waypoint NAME
e.g. "START+4000" then in this example the Nav Instrument will display 4000 (feet) for the "START" waypoint. This will be more
important if/when I add 'estimated arrival height' as a function of the Nav instrument.

An example Mifflin_Day1.pln MSFS flight plan for a soaring task is included.

See https://xp-soaring.github.io/fsx/missions/mifflin/overview.htm

Set the wind for 315 degrees / 17 knots / no gusts. This is harder than it sounds so ask the FB ground if you're unsure.

##########################
# Winter Vario
##########################

The Winter vario is permanently showing Total-Energy Compensated Sink Rate.

If you are flying at a steady speed, this is identical to the speed you're sinking towards the ground.

If you are accelerating/decelerating then the gauge compensates for that making the underlying sink rate easier to see.

######################
# Cambridge Vario
######################

The Cambridge Vario has 3 modes (toggle with hot-key/button assigned to "TOGGLE BEACON LIGHTS"):

AUTO MODE:
* icon at 3-o-clock will be blank (cruise) or a circle-arrow (climb)
* Average at 6-o-clock will be:
- cruise: rolling average Netto
- climb: true climb average since entering climb mode.
* Needle and Audio will be:
- cruise: Netto
- climb: TE

In AUTO MODE the gauge will switch sensibly between the AUTO-CRUISE and AUTO-CLIMB modes, e.g. a variety of different situations will
cause the gauge to operate in AUTO-CLIMB mode (needle showing TE climb rate, AUDIO on TE, averager giving you the TRUE climb rate
since you entered this mode). For example, selecting flaps T1 or T2, flying below 70 knots in rising air will cause the
Cambridge vario to assume you are trying to thermal. Flying fast, or simply flying in a straight line without climbing, will cause
the vario to exit climb mode.

CLIMB MODE:
* icon at 3-o-clock will say "TE"
* Average at 6-o-clock will be rolling average TE
* Needle and Audio will be TE
* The vario will remain fixed in this mode, with no auto-switching

CRUISE MODE:
* icon at 3-o-clock will say "Net"
* Average at 6-o-clock will be rolling average Netto
* Needle and Audio will be Netto
* The vario will remain fixed in this mode, with no auto-switching

##########################
# General info
##########################

Power on/off (default Alt-B) should work as expected. The instruments should cope with 'slew mode' and 'pause' ok.
I have NOT yet programmed the Cambridge 'true average' to detect pause/slew yet.

There is a hot-key (whatever you have assigned to "TOGGLE CABIN LIGHTS" ) to bring up DEBUG DATA including glide ratio.

* ASI has (top) TRUE AIRSPEED (bottom) GROUND SPEED kph
* Nav has (bottom left) GLIDE RATIO
* WINTER has (bottom) TE m/s
* Cambridge has (bottom) Netto m/s.

The Netto is calibrated with the correct polar, so in STILL AIR if you're flying properly (e.g. in the right flap, wheel up,
spoilers closed) it should read zero. Any difference is the sim flightmodel error or you are not flying in still air (easiest
check is the L/D in the Nav display).

MSFS gusts are not sensibly implemented currently, so you need to disable those or will have excessive jitter in the vario needles.






Add-on authors

Michael Rossi
Alex Marko
Ian Lewis

---------------------

Links

Touching Cloud website http://msfs.touching.cloud

MS Flight Simulator Gliders FB group https://www.facebook.com/groups/1803376689823050

MSFS Soaring Club Discord group https://discord.gg/2wRgYSXTNA

---------------------

2021