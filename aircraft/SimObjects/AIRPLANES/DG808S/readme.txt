
DG-808S - Glider converted from FSX with the MSFS Legacy Importer program, by Alex Marko

Important - Copyright, this aircraft is a conversion with the MSFS Legacy Importer program by Alex Marko, of the DG-808S by FSX Microsoft. 
You can only use this conversion if you are licensed for FSX and MSFS 2020. 

You are not authorized to disclose this link which, is for personal backup only.

---------------------

VERY IMPORTANT modification from fsx version, to have a glide with efficiency and real glide speed.

[FLIGHT_TUNING]
cruise_lift_scalar = 2 ;
parasite_drag_scalar = 0.5 ;
induced_drag_scalar = 0.5

[FLAPS.0]
lift_scalar = 2 ; Scalar coefficient to ponderate global flap lift coef (non dimensioned)
drag_scalar = 0.5 ; Scalar coefficient to ponderate global flap drag coef (non dimensioned)

---------------------

If you also convert the [AERODYNAMICS] section you must correct the aero_center_lift value which must be (negative) approximately 1/4 of the wing_root_chord variable - IF wing_root_chord = 3.03 ; Feet

[AERODYNAMICS]

aero_center_lift = -0.75 ; -9.5 Init to center CA

---------------------

ENGINE - Inserted two jet engines, to simulate a towing plane, with only 1 gallon of petrol, if you don't want to use this function just put 0 in the tank variable

[FUEL]
center1 = -2.075,0.000000,0.000000,1.000000,0.000000;

Edited the file - runway.flt - to have the engine ready when you start from the ground and with the brakes already off

---------------------

SOUND - Used the new MSFS sound of Asobo_VL3.
Inserted the vario sound in the original file - sound.xml - and removed the engine sound, leaving only a sound when the fuel runs out and the engine is switched off, to simulate the sound, of towing release.

---------------------

TEXTURE - Texture changed - dg808s_t.dds - in the position of the glass, to solve the invisible glass problem from the outside view
