/*
    This script computes:
        * TE
        * polar sink
        * NETTO
        * Cruise/Climb mode
        * Vario Tone
    And contains the initialization and update code for the following gauges:
        * winter (TE vario)
        * variometer (Cambridge TE/Netto computer vario)
        * asi
        * nav_display

    Versions:
        0.42 - version added to code
        0.41 - TE, netto, trim, nav working. Nav middle text 'alt' is just from flightplan.
               TIMECRUIS and TIMEDSCNT waypoints in flightplan.
*/

class gauges_dg808s_panel_2 extends TemplateElement {

    constructor() {
        super();
        this.VERSION = "v.44";
        // Constants
        this.MS_TO_KT = 1.94384; // speed conversion consts
        this.MS_TO_KPH = 3.6;    // meter per second to kilometer per hour
        this.M_TO_F = 3.28084;   // meter to foot
        this.MS_TO_FPM = 196.85; // meter per second to foot per minute
        this.RAD_TO_DEG = 57.295; // Radians to degrees

        this.location = "interior";
        this.curTime = 0.0;
        this.bNeedUpdate = false;
        this._isConnected = false;
		this.lastCheck = 0;
        this.climbValues = new Array(30);

        // 'Global' vars used by multiple instruments
        this.time_s = null;
        this.vertical_speed_ms = 0;
        this.airspeed_ms = 0;
        this.altitude_m = 0;

        // Netto vars
        this.netto_ms = 0;

        // Initialise polar data structure (for speed->sink calculation)
        this.polar_init();
    }

    get templateID() { return "gauges_dg808s_panel_2"; }

    // ********************************************************************
    // ********** CONNECTED CALLBACK         ******************************
    // ********************************************************************
    connectedCallback() {
        super.connectedCallback();
        let parsedUrl = new URL(this.getAttribute("Url").toLowerCase());
        // ********************************************
        // Setup call to this.Update() on each frame
        // ********************************************
        let updateLoop = () => {
            if (!this._isConnected)
                return;
            this.Update();
            requestAnimationFrame(updateLoop);
        };
        this._isConnected = true;
        requestAnimationFrame(updateLoop);
    }

    // ********************************************************************
    // ********** DISCONNECTED CALLBACK         ***************************
    // ********************************************************************
    disconnectedCallback() {
        super.disconnectedCallback();
    }

    //********************************************************************
    // SETUP FUNCTIONS - called from class constructor
    //********************************************************************

    // Displays the gauges version (this.VERSION) on the panel
    version_init() {
        if (this.version_init_done) {
            return;
        }
        let version_el = this.querySelector("#debug_version");
        if (typeof version_el !== "undefined") {
            version_el.innerHTML = this.VERSION;
            this.version_init_done = true;
        }

    }


    // ************************************************************
    // polar_init()
    // Initializes the this.polar_speed and this.polar_sink arrays.
    // E.g. at 100Kph in still air the DG808S will sink at 0.57 m/s.
    // ************************************************************
    polar_init() {
        // We input polar in km/h : m/s (which will be converted to m/s : m/s)
        //            [ speed km/h, sink m/s ] (sink positive)
        this.polar = [ [ -10, 10],
                        [ 60, 3],
                        [ 70, 0.6],
                        [ 72, 0.5],
                        [ 80, 0.48],
                        [ 90, 0.5],
                        [100, 0.57],
                        [110, 0.61],
                        [120, 0.67],
                        [130, 0.75],
                        [150, 0.98],
                        [170, 1.29],
                        [200, 1.9],
                        [210, 2.3],
                        [220, 2.9],
                        [230, 3.6],
                        [300, 8.5]
                    ];

        // Convert speeds KPH -> M/S
        for (let i=0;i<this.polar.length;i++) {
            this.polar[i][0] = this.polar[i][0] / this.MS_TO_KPH; // polar speeds in m/s
        }
    }

    //********************************************************************
    // LOCAL FUNCTIONS - called from the update loop
    //********************************************************************

    Update() {
        // Display code version on panel (only on startup)
        this.version_init();

        // Collect simvar data used by multiple instruments
        this.global_vars_update();

        this.total_energy_update();
        this.netto_update();
        this.climb_mode_update();

        // Now update instruments
        this.winter_update();
        this.asi_update();
        this.variometer_update();
        this.nav_display_update();

        // This debug routine paints var values onto panel, toggled with 'L' (lights) key.
        this.debug_update();
    }

    // **********************************************************************************************************************
    // **********************************************************************************************************************
    // ******* SOME UTILITY FUNCTIONS     ***********************************************************************************
    // **********************************************************************************************************************
    // **********************************************************************************************************************

    // degrees to radians
    rad(x) {
          return x / this.RAD_TO_DEG;
    }

    // Return distance in m between positions p1 and p2.
    // lat/longs in e.g. p1.lat etc (each as {lat: , lng: })
    get_distance(p1, p2) {
        var R = 6371000; // Earth's mean radius in meter
        var dLat = this.rad(p2.lat - p1.lat);
        var dLong = this.rad(p2.lng - p1.lng);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(this.rad(p1.lat)) * Math.cos(this.rad(p2.lat)) *
                            Math.sin(dLong / 2) * Math.sin(dLong / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d; // returns the distance in meter
    }

    // Bearing in degrees from point p1 -> p2 (each as {lat: , lng: })
    get_bearing(p1, p2) {
        var a = { lat: this.rad(p1.lat), lng: this.rad(p1.lng) };
        var b = { lat: this.rad(p2.lat), lng: this.rad(p2.lng) };

        var y = Math.sin(b.lng-a.lng) * Math.cos(b.lat);
        var x = Math.cos(a.lat)*Math.sin(b.lat) -
                    Math.sin(a.lat)*Math.cos(b.lat)*Math.cos(b.lng-a.lng);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    // Return interpolated result for 'value' using array 'lookup_table'
    // Where 'lookup_table' is array of [ value, result ] pairs (e.g. this.polar)
    interpolate(lookup_table, input_value) {
        // Convenience consts for the INPUT and RESULT fields of the interpolation array entry
        const INPUT = 0;
        const RESULT = 1;
        let lookup_count = lookup_table.length;
        // Don't interpolate off the ends of the lookup table, just return the min or max result.
        if (input_value < lookup_table[0][INPUT]) {
            return lookup_table[0][RESULT];
        }
        if (input_value > lookup_table[lookup_count-1][INPUT]) {
            return lookup_table[lookup_count-1][RESULT];
        }
        let i = 0;
        // Iterate through 'polar_speed_ref' array until airspeed between [i-1]th and [i]th
        while (i < lookup_count && input_value > lookup_table[i][INPUT]) {
            i++;
        }
        // Check value < lowest value in lookup
        if (i == 0) {
            return lookup_table[0][RESULT];
        }
        let value_diff = lookup_table[i][INPUT] - lookup_table[i-1][INPUT];
        let result_diff = lookup_table[i][RESULT] - lookup_table[i-1][RESULT];
        let value_ratio = (input_value - lookup_table[i-1][INPUT]) / value_diff;

        return lookup_table[i-1][RESULT] + result_diff * value_ratio;
    }

    // **********************************************************************************************************************
    // **********************************************************************************************************************
    // ******* SOARING FUNCTIONS         ***********************************************************************************
    // **********************************************************************************************************************
    // **********************************************************************************************************************

    // ************************************************************
    // polar_sink(airspeed m/s) returns sink m/s
    // Interpolates in this.polar_speed_ref / this.polar_sink_ref
    // ************************************************************
    polar_sink(airspeed) {
        return this.interpolate(this.polar, airspeed);
    }

    // ************************************************************
    // Update 'global' values from Simvars
    // ************************************************************
    global_vars_update() {
        this.slew_mode = SimVar.GetSimVarValue("IS SLEW ACTIVE", "bool");
        // this.pause_mode
        this.pause_mode_update(); // Set this.pause_mode:
        // this.power_switch
        // this.power_status
        this.power_update(); // Set this.power_switch;
        this.time_s = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");
        //this.airspeed_ms = SimVar.GetSimVarValue("A:AIRSPEED INDICATED", "feet per second") / this.M_TO_F;
        this.airspeed_ms = SimVar.GetSimVarValue("A:AIRSPEED TRUE", "feet per second") / this.M_TO_F;
        this.vertical_speed_ms = SimVar.GetSimVarValue("A:VELOCITY WORLD Y", "feet per second") / this.M_TO_F;
        this.altitude_m = SimVar.GetSimVarValue("A:INDICATED ALTITUDE", "feet") / this.M_TO_F;
    }

    // update this.pause_mode
    pause_mode_update() {
        // These VELOCITY vars freeze during pause
        let speed2 = SimVar.GetSimVarValue("VELOCITY WORLD Z","feet per second")**2 +
                     SimVar.GetSimVarValue("VELOCITY WORLD X","feet per second")**2;
        if (this.pause_mode_previous_speed2 != null) {
            let on_ground = SimVar.GetSimVarValue("SIM ON GROUND","bool");
            this.pause_mode = !on_ground && (speed2 == this.pause_mode_previous_speed2); // in air and speed EXACTLY fixed
        }
        this.pause_mode_previous_speed2 = speed2;
    }

    // Set this.power_switched when power CHANGES - note it will go true FOR A SINGLE UPDATE CYCLE
    // Set this.power_status to true/false if power is ON/OFF
    power_update() {
        this.power_switched = false;
	    const new_power_status = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") ? true : false;
        if (typeof this.power_status === "undefined" ) {
            this.power_switched = true;
        } else if (new_power_status && !this.power_status) {
            this.power_switched = true;
        } else if (!new_power_status && this.power_status) {
            this.power_switched = true;
        }
        this.power_status = new_power_status;
    }

    // ************************************************************
    // Set "L:TOTAL ENERGY, meters per second"  climb rate
    // ************************************************************

    total_energy_init() {
        // Total Energy vars
        this.te_previous_time_s = this.time_s;
        this.te_previous_airspeed_ms = this.airspeed_ms;
        this.te_raw_ms = 0;
        this.te_ms = 0;
        this.te_previous_slew_mode = false;
        //DEBUG
        this.te_compensation_ms = 0;
    }

    total_energy_update() {
        let g = 9.81; // Gravitational constant

        // Detect startup and call init()
        if (this.te_previous_time_s == null) {
            this.total_energy_init();
            return;
        }

        if (this.pause_mode) {
            return;
        }

        // Detect slew mode and do not update
        if (this.slew_mode) {
            this.te_previous_slew_mode = true;
            return;
        } else if (this.te_previous_slew_mode) {
            // We just came out of slew mode
            this.total_energy_init();
            return;
        }

        let time_delta_s = this.time_s - this.te_previous_time_s;
        // Avoid a bad reading or divide-by-zero if this frame is ~same as previous
        if (time_delta_s < 0.0001) {
            return this.te_ms;
        }

        //let previous_airspeed_ms = this.airspeed_ms - SimVar.GetSimVarValue("ACCELERATION BODY Z", "feet per second squared") / this.M_TO_F * time_delta_s;
        let airspeed_ms_squared_delta = this.airspeed_ms**2 - this.te_previous_airspeed_ms**2;
        //let airspeed_ms_squared_delta = this.airspeed_ms**2 - previous_airspeed_ms**2;
        this.te_compensation_ms = airspeed_ms_squared_delta / (2 * g * time_delta_s);
        this.te_raw_ms = this.vertical_speed_ms + this.te_compensation_ms;

        // smoothing TE
        let te_ms = 0.98 * this.te_ms + 0.02 * this.te_raw_ms;

        te_ms = Math.max(Math.min(te_ms,10),-10); // Limit our TE value to +/- 10m/s to reduce settling time

        //DEBUG
        //let airspeed_delta = this.airspeed_ms - previous_airspeed_ms;

        // OK we've calculated te_ms, so can store the current time/speed/height for the next update
        this.te_previous_airspeed_ms = this.airspeed_ms;
        this.te_previous_time_s = this.time_s;

        // Set the local var and SimVar
        this.te_ms = te_ms;
        SimVar.SetSimVarValue("L:TOTAL ENERGY", "meters per second", te_ms);
    }

    // **************************************************************************************************
    // Set "L:NETTO, meters per second"  climb rate
    // Netto is simple the TE climb rate with the natural sink of the aircraft (from the polar) removed
    // **************************************************************************************************

    netto_update() {
        // Uses this.te_ms
        // Uses this.airspeed_ms
        // Uses this.netto_ms

        // In SLEW mode, do not update NETTO
        if (this.slew_mode || this.pause_mode) {
            return;
        }
        // Note polar_sink is POSITIVE
        //Set the local var and SimVar
        this.netto_ms = this.te_ms + this.polar_sink(this.airspeed_ms);

        // At low airspeed (e.g. on runway) then reduce netto reading
        // A real instrument will read 0 at an airspeed of 0
        if (this.airspeed_ms < 15) {
            // effective speed is 0..10 for airspeeds of 5..15
            let effective_speed_ms = Math.max(0,this.airspeed_ms - 5);
            // We gradually 'feed in' the correct netto between 5..15 m/s airspeed
            this.netto_ms = this.netto_ms * effective_speed_ms / 10;
        }

        SimVar.SetSimVarValue("L:NETTO", "meters per second", this.netto_ms);
    }

    // ***************************************************************
    // Update cruise/climb mode (Audio will switch Netto -> TE)
    // ***************************************************************

    climb_mode_init() {
        this.climb_mode_time_s = this.time_s;
        this.climb_mode_bank_rad = 0; // PLANE BANK ROLLING AVG (used to recognise cruise)
        this.climb_mode = false;
    }

    climb_mode_update() {
        if (this.climb_mode_time_s == null) {
            this.climb_mode_init();
            return;
        }

        // T1, T2, L flaps => CLIMB
        let flap_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
        if (flap_index > 3) {
            this.climb_mode = true;
            return;
        }

        // Below 70 knots airspeed with +ve NETTO => CLIMB
        if (this.airspeed_ms * this.MS_TO_KT < 70 && this.netto_ms > 0.3) {
            this.climb_mode = true;
            return;
        }

        // wings level for a while & not in lift => CRUISE
        this.climb_mode_bank_rad = SimVar.GetSimVarValue("A:PLANE BANK DEGREES", "radians") * 0.005 + this.climb_mode_bank_rad * 0.995;
        if (this.climb_mode_bank_rad < 0.1 && this.netto_ms < 0.5 ) {
            this.climb_mode = false;
            return;
        }

        // Above 70 knots airspeed => CRUISE
        if (this.airspeed_ms * this.MS_TO_KT > 70) {
            this.climb_mode = false;
            return;
        }
    }

    //******************************************************************************
    //******************************************************************************
    //************** INSTRUMENT UPDATES     ****************************************
    //******************************************************************************
    //******************************************************************************

    //******************************************************************************
    //************** WINTER VARIO     **********************************************
    //******************************************************************************
    winter_update() {
        const min = -5;    // m/s
        const max = 5;     // m/s
        const max_degrees = 135;
		/* VSI_VSI_NEEDLE_0 */
		var winter_needle_el = this.querySelector("#winter_needle");
		if (typeof winter_needle_el !== "undefined") {
            let te_ms = this.te_ms;
            // Limit range to -5 .. +5 m/s
            te_ms = Math.min(te_ms, max);
            te_ms = Math.max(te_ms, min);
			let transform = 'rotate('+(te_ms / max * max_degrees)+'deg)';
		    winter_needle_el.style.transform = transform;
		}
    }

    // *************************************************************************************************************************
    // ************* AIRSPEED INDICATOR                       ******************************************************************
    // *************************************************************************************************************************
    asi_update() {
		let asi_needle_el = this.querySelector("#asi_needle");
		if (typeof asi_needle_el == "undefined") {
            return;
        }
		let airspeed_knots = SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots");
        airspeed_knots = Math.min(Math.max(airspeed_knots, 0), 160);
        // This table gives the degrees rotation of the needle for each airspeed (for interpolation)
		let rotate_table = [[0, 0],[15, 0],[20, 18],[40, 110],[50, 156],[60, 215],[80, 285],[100, 348],[120, 400],[160,500]];
        let degrees = Math.floor(this.interpolate(rotate_table, airspeed_knots)+0.5);

		let transform = 'rotate(' + degrees + 'deg) ';
        asi_needle_el.style.transform = transform;
    } // end asi_update()

    // *************************************************************************************************************************
    // ************* CAMBRIDGE VARIO                          ******************************************************************
    // *************************************************************************************************************************

    // Initialise values on power-on
    variometer_init() {
        this.variometer_init_time_s = this.time_s; // Flag for init() run
        this.variometer_update_time_s = null;    // time when digits on vario were last updated
        this.variometer_mode_var = ["LIGHT BEACON ON","boolean"]; // Var to manual switch cruise/climb
        //this.variometer_mode_var = ["VARIOMETER SWITCH","boolean"]; // MSFS not implemented !!
        this.variometer_mode = "AUTO"; // CRUISE / CLIMB / AUTO
        this.variometer_previous_mode = "AUTO";
        this.variometer_previous_switch = SimVar.GetSimVarValue(this.variometer_mode_var[0], this.variometer_mode_var[1]);
        this.variometer_previous_climb_mode = null; // will be boolean true => climb, false => cruise
        this.variometer_average_te_ms = 0;    // rolling average (m/s) for TE
        this.variometer_average_netto_ms = 0; // rolling average (m/s) for NETTO
        this.variometer_previous_average_ms = 0; // Cached previous average value for comparison indicators
        this.variometer_mode_time_s = this.time_s;      // MSFS timestamp when climb/cruise started
        this.variometer_altitude_start_m = 0;    // start height of cruise or climb

        // Enable all variometer display elements
        this.querySelector(".variometer_battery_required").style.display = "block";

        // "88" as flaps display, all flap alerts displayed
        this.variometer_display_flap(-1);

        // "-8.8" as average display, plus BOTH increasing and decreasing indicators
        this.variometer_display_number(-18.8, true, true);
    }

    variometer_update() {
        const POWER_UP_TIME_S = 6; // duration (sec) of full power-up sequence

        // Note this.power_switched is always true on startup
        if (this.power_switched) {
            if (this.power_status) {
                this.variometer_init();
            } else {
                this.querySelector(".variometer_battery_required").style.display = "none";
                this.variometer_tone_update(0);
                this.variometer_display_needle(0);
            }
            return;
        }

        // Do nothing if no power
        if (!this.power_status) {
            return;
        }

        //if (!this.variometer_init_time_s) this.variometer_init();

        // If we're inside the 'power up' time, we just animate the gauge
        if (this.time_s - this.variometer_init_time_s < POWER_UP_TIME_S) {
            const CYCLE_TIME_S = POWER_UP_TIME_S * 2 / 3;
            const POWER_UP_DELAY_S = POWER_UP_TIME_S - CYCLE_TIME_S;
            // 't' is time within CYCLE_TIME_S
            let t = this.time_s - this.variometer_init_time_s - POWER_UP_DELAY_S;
            // Do nothing during the power-up delay period
            if (t < 0) {
                return;
            }
            // Sweep needle across full range
            let needle_value = -5 * Math.sin(t / CYCLE_TIME_S * 2 * Math.PI);
            this.variometer_display_needle(needle_value);
            return;
        }

        const UPDATE_S = 3; // Update the digits on the display every 3 seconds

        // Update basic rolling average of TE climb/sink
        this.variometer_average_te_ms = 0.99 * this.variometer_average_te_ms + 0.01 * this.te_ms;

        // Update basic rolling average of NETTO climb/sink
        this.variometer_average_netto_ms = 0.99 * this.variometer_average_netto_ms + 0.01 * this.netto_ms;

        // On startup write a zero the the averager display
        if (this.variometer_update_time_s == null) {
            this.variometer_display_number(0, false, false); // display 0, no increasing/decreasing indicators
            this.variometer_update_time_s = this.time_s; // Initialize update time
        }

        let vario_climb_mode = this.variometer_update_mode(); // vario_climb_mode will be true/false

        let needle_value_ms = vario_climb_mode ? this.te_ms : this.netto_ms;
        this.variometer_display_needle(needle_value_ms);

        this.variometer_tone_update(needle_value_ms);

        // Update the flap indicator
        let flap_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
        this.variometer_display_flap(flap_index);

        // Detect climb/cruise mode change
        // Also this.variometer_mode will have been set to "CRUISE" | "CLIMB" | "AUTO"
        if (vario_climb_mode != this.variometer_previous_climb_mode ||
                this.variometer_mode != this.variometer_previous_mode) {
            this.variometer_mode_time_s = this.time_s; // store start time of climb or cruise (e.g. for true average climb)
            this.variometer_update_time_s = this.time_s; // Initialize update time
            this.variometer_altitude_start_m = this.altitude_m;
            this.variometer_previous_climb_mode = vario_climb_mode;
            this.variometer_previous_mode = this.variometer_mode;
            this.variometer_average_netto_ms = 0; // Always reset the averages when we switch mode
            this.variometer_average_te_ms = 0;

            // Set/hide circling/TE/N indicators
            let variometer_auto_climb_el = this.querySelector("#variometer_mode_auto_climb");
            let variometer_climb_el = this.querySelector("#variometer_mode_climb");
            let variometer_cruise_el = this.querySelector("#variometer_mode_cruise");
            if (this.variometer_mode == "CRUISE") {
                variometer_auto_climb_el.style.display = "none";
                variometer_climb_el.style.display = "none";
                variometer_cruise_el.style.display = "block";
            } else if (this.variometer_mode == "CLIMB") {
                variometer_auto_climb_el.style.display = "none";
                variometer_cruise_el.style.display = "none";
                variometer_climb_el.style.display = "block";
            } else { // AUTO
                variometer_cruise_el.style.display = "none";
                variometer_climb_el.style.display = "none";
                if (vario_climb_mode) {
                    variometer_auto_climb_el.style.display = "block";
                } else {
                    variometer_auto_climb_el.style.display = "none";
                }
            }
        }

        // Update the digits on the vario display (e.g. averager)
        if (this.time_s - this.variometer_update_time_s > UPDATE_S) {
            this.variometer_update_time_s = this.time_s;

            let average_ms;
            // Calculate averager reading m/s in each variometer mode, i.e.
            //    "AUTO" -> rolling NETTO in cruise, or TRUE CLIMB in climb.
            //    "CRUISE" -> rolling NETTO
            //    "CLIMB" -> rolling TE
            if (this.variometer_mode == "AUTO" && vario_climb_mode ) {
                let climb_duration_s = this.time_s - this.variometer_mode_time_s;
                // avoid divide by zero
                if (climb_duration_s > 2) {
                    // Note we could adjust for Kinetic Energy loss
                    average_ms = (this.altitude_m - this.variometer_altitude_start_m) / climb_duration_s;
                } else {
                    return;
                }
            } else if (this.variometer_mode == "CLIMB") { // Fixed 'CLIMB' mode
                average_ms = this.variometer_average_te_ms;
            } else {
                average_ms = this.variometer_average_netto_ms;
            }

            average_ms = Math.round(average_ms*10) / 10;
            let increasing = average_ms > this.variometer_previous_average_ms;
            let decreasing = average_ms < this.variometer_previous_average_ms;

            this.variometer_previous_average_ms = average_ms; // Store current average for next comparison

            this.variometer_display_number(average_ms * this.MS_TO_KT, increasing, decreasing);
        }

    }

    // VARIO TONE
    variometer_tone_update(needle_value_ms) {
		if (this.power_status) {
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", needle_value_ms * this.MS_TO_FPM);
        } else {
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", 0);
        }
    }

    // Toggle the variometer between CRUISE -> CLIMB -> AUTO, and return true/false for climb mode:
    // If the mode is CLIMB, return true (manual selected climb mode)
    // If the mode is CRUISE, return false (manual selected cruise mode)
    // If the mode if AUTO, return this.climb_mode
    variometer_update_mode() {
        // this.variometer_mode_var true => CLIMB mode
        let vario_switch = SimVar.GetSimVarValue(this.variometer_mode_var[0], this.variometer_mode_var[1]);
        // Detect a switch change, if so change this.variometer_mode
        if (vario_switch != this.variometer_previous_switch) {
            this.variometer_previous_switch = vario_switch;
            // Toggle variometer_mode CRUISE -> CLIMB -> AUTO
            if (this.variometer_mode == "CRUISE") {
                this.variometer_mode = "CLIMB";
            } else if (this.variometer_mode == "CLIMB") {
                this.variometer_mode = "AUTO";
            } else {
                this.variometer_mode = "CRUISE";
            }
        }
        // Select the AUTO climb mode value
        let return_climb_mode = this.climb_mode;
        // Override if "CRUISE" or "CLIMB" modes
        if (this.variometer_mode == "CRUISE") {
            return_climb_mode = false;
        } else if (this.variometer_mode == "CLIMB") {
            return_climb_mode = true;
        }
        return return_climb_mode;
    }


    // Update the needle position
    variometer_display_needle(needle_value) {
        // Update needle
        const MIN = -5;    // m/s
        const MAX = 5;     // m/s
        const MAX_DEGREES = 179;
		let variometer_needle_el = this.querySelector("#variometer_needle");
		if (typeof variometer_needle_el !== "undefined") {
            // Limit range to -5 .. +5 m/s
            needle_value = Math.min(needle_value, MAX);
            needle_value = Math.max(needle_value, MIN);
			let transform = 'rotate('+(needle_value / MAX * MAX_DEGREES)+'deg)';
		    variometer_needle_el.style.transform = transform;
		}

    }

    // Update the variometer average display area with average (float), and increasing/decreasing indicators (booleans)
    variometer_display_number(display_value, increasing, decreasing) {
        // Update averager reading
        let averager_digits_el = this.querySelector("#variometer_averager_digits");
        let averager_decimal_el = this.querySelector("#variometer_averager_decimal");
        let averager_sign_el = this.querySelector("#variometer_averager_sign");
		if (typeof averager_digits_el !== "undefined" && typeof averager_decimal_el !== "undefined") {
            let v = Math.round(display_value * 10);
            let sign = v <= -1 ? "-" : "";
            v = Math.min(Math.abs(v),199); // Limit display to +/-19.9 max
            let digits =  Math.trunc(v/10);
            let decimal = v % 10;
            // Note no "-" in front of 0.0 (e.g. from display value -0.04)
            averager_digits_el.innerHTML = digits;   // [sign+]integer(s)
            averager_decimal_el.innerHTML = "" + decimal;    // tenths
            averager_sign_el.innerHTML = sign;
        }
        // Set increasing / decreasing indicators
        let increasing_el = this.querySelector("#variometer_average_increasing");
        if (typeof increasing_el !== "undefined") {
            increasing_el.style.display = increasing ? "block" : "none";
        }
        let decreasing_el = this.querySelector("#variometer_average_decreasing");
        if (typeof decreasing_el !== "undefined") {
            decreasing_el.style.display = decreasing ? "block" : "none";
        }
    }

    variometer_display_flap(flap_index) {
        let flap_display = this.querySelector("#variometer_flap_display");
        // Startup only - show all icons
        if (flap_index < 0) {
    		if (typeof flap_display !== "undefined") {
                flap_display.innerHTML = "88";
            }
            this.variometer_display_flap_alert([[true,true],[true,true]]);
            return;
        }
        // Display of flap setting name (e.g. "T1")
		if (typeof flap_display !== "undefined") {
            let flap_str = [ "-3","-2","-1","0","T1","T2","L" ][flap_index];
            flap_display.innerHTML = flap_str;
        }

        // Display appropriate 'flap alert' symbols
        // flap alert controls flap indicator arrows [[+,++],[-,--]]
        let flap_alert = [[false,false],[false,false]];
        if (this.airspeed_ms < 20) {  // Slower than 40 knots ?
            this.variometer_display_flap_alert([[false,false],[false,false]]);
        } else if (flap_index == 6) { // Landing flap ?
            if (this.airspeed_ms > 40) {
                this.variometer_display_flap_alert([[true,true],[false,false]]);
            } else {
                this.variometer_display_flap_alert([[false,false],[false,false]]);
            }
        } else {
            // We can calculate an 'exact' flap index from speed ->lookup table
            let kps_to_flap = [[-100,6],[0,6],[87,5],[98,4],[109,3],[147,2],[175,1],[400,0]];
            let exact_flap_index = this.interpolate(kps_to_flap, this.airspeed_ms * this.MS_TO_KPH);
            // E.g. if you are flying at 128kph, exact_flap_index - 2.5
            let flap_delta = exact_flap_index - flap_index;
            if (flap_delta >=0 && flap_delta <= 1) {
                this.variometer_display_flap_alert([[false,false],[false,false]]);
            } else if (flap_delta >= 1 && flap_delta <= 2) {
                this.variometer_display_flap_alert([[false,false],[true,false]]);
            } else if (flap_delta > 2) {
                this.variometer_display_flap_alert([[false,false],[true,true]]);
            } else if (flap_delta <= 0 && flap_delta >= -1) {
                this.variometer_display_flap_alert([[true,false],[false,false]]);
            } else if (flap_delta <= -1) {
                this.variometer_display_flap_alert([[true,true],[false,false]]);
            }
        }
    }

    // flap alert controls flap indicator arrows [[+,++],[-,--]]
    variometer_display_flap_alert(flap_alert) {
        let up_1 = this.querySelector("#variometer_flap_up_1");
        let up_2 = this.querySelector("#variometer_flap_up_2");
        let down_1 = this.querySelector("#variometer_flap_down_1");
        let down_2 = this.querySelector("#variometer_flap_down_2");
        up_1.style.display = flap_alert[0][0] ? "block" : "none";
        up_2.style.display = flap_alert[0][1] ? "block" : "none";
        down_1.style.display = flap_alert[1][0] ? "block" : "none";
        down_2.style.display = flap_alert[1][1] ? "block" : "none";
    }

    // *************************************************************************************************************************
    //************** NAV INSTRUMENT     ****************************************************************************************
    // *************************************************************************************************************************

    nav_display_init() {
        this.nav_display_init_time_s = this.time_s;

        this.nav_display_next_var = ["LIGHT NAV ON","bool"]; // Toggling the var will select next WP
        this.nav_display_previous_next_var = SimVar.GetSimVarValue(this.nav_display_next_var[0], this.nav_display_next_var[1]);

        // Display elements
        this.nav_display_top_el = this.querySelector("#nav_display_top");
        this.nav_display_middle_el = this.querySelector("#nav_display_middle");
        this.nav_display_bottom_el = this.querySelector("#nav_display_bottom");

        // Flightplan
        this.nav_display_flightplan = new Array();

        // Enable all variometer display elements
        this.querySelector(".nav_display_battery_required").style.display = "block";

        // Gauge needs to hide previous displayed pointer element
        this.nav_display_previous_pointer_el = this.querySelector("#nav_display_all"); // start with all pointer elements lit

        this.nav_display_top_el.innerHTML = "B21-NAV";
        this.nav_display_middle_el.innerHTML = "8888";
        this.nav_display_bottom_el.innerHTML = "8888";
    }

    // Update function for nav_display, called on each sim update loop
    nav_display_update() {

        // Note this.power_switched is always true on startup
        if (this.power_switched) {
            if (this.power_status) {
                this.nav_display_init();
                this.nav_display_flightplan_update(); // Initiate flightplan request
            } else {
                this.querySelector(".nav_display_battery_required").style.display = "none";
            }
            return;
        }

        // Do nothing if no power
        if (!this.power_status) {
            return;
        }

        this.nav_display_flightplan_update(); // Continue flightplan request processing

        const POWER_UP_TIME_S = 6; // duration (sec) of full power-up sequence

        // If we're inside the 'power up' time, we just animate the gauge
        if (this.time_s - this.nav_display_init_time_s < POWER_UP_TIME_S) {
            const CYCLE_TIME_S = POWER_UP_TIME_S * 3/4;
            const POWER_UP_DELAY_S = POWER_UP_TIME_S - CYCLE_TIME_S;
            // 't' is time within CYCLE_TIME_S
            let t = this.time_s - this.nav_display_init_time_s - POWER_UP_DELAY_S;
            // Do nothing during the power-up delay period
            if (t < 0) {
                return;
            }
            // Sweep needle across full range -3, .. , +3
            let pointer_value = Math.round(3 * Math.sin(Math.PI / 2 + t / CYCLE_TIME_S * 3 * Math.PI / 2));
            this.nav_display_pointer(pointer_value);
            return;
        }

        // ************************************************************
        // Detect a nav_display_next_var toggle - SELECT NEXT WAYPOINT
        // ************************************************************
        let next_var = SimVar.GetSimVarValue(this.nav_display_next_var[0], this.nav_display_next_var[1]);
        if (this.nav_display_flightplan_active && next_var != this.nav_display_previous_next_var) {
            // User has toggled nav_display_next_var
            this.nav_display_previous_next_var = next_var; // reset for next toggle
            this.nav_display_wp_index += 1;
            // Increment wp index, rotate back to 0 if at end.
            if (this.nav_display_wp_index >= this.nav_display_flightplan.length) {
                this.nav_display_wp_index = 0;
            }
        }

        // Display next WP id
        //let wp_id = SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
        let name = this.nav_display_flightplan[this.nav_display_wp_index].name;
        let top_str = (this.nav_display_wp_index == 0 ? "" : this.nav_display_wp_index+".")+name;
        if (top_str.length > 8) {
            this.nav_display_top_el.style["font-size"] = Math.floor(22 * (8/top_str.length))+"px";
        } else {
            this.nav_display_top_el.style["font-size"] = "22px";
        }
        this.nav_display_top_el.innerHTML = top_str;

        // Display elevation of WP
        //let height = Math.floor(SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointAltitude", "meters") * this.M_to_F);
        let alt_ft = Math.floor(this.nav_display_flightplan[this.nav_display_wp_index].alt_m * this.M_TO_F + 0.5);
        let middle_str = alt_ft;
        this.nav_display_middle_el.innerHTML = middle_str;

        let position = this.nav_display_get_position();

        // Display distance to WP
        // Calculate distance to next WP, in Km and create display string e.g. "10" or "4.5"
        let wp_position = this.nav_display_flightplan[this.nav_display_wp_index].position;
        let distance = this.get_distance(position, wp_position) / 1000; //SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointDistance", "meters") / 1000; // distance to WP in Km
        if (distance >= 10) { // Above 10Km, just show whole Km
            distance = distance.toFixed(0);
        } else {             // Below 10Km, show decimals
            distance = distance.toFixed(1);
        }
        //let distance = Math.floor(SimVar.GetSimVarValue("GPS WP DISTANCE", "meters") / 1000);
        this.nav_display_bottom_el.innerHTML = distance;

        let wp_bearing = this.get_bearing(position, wp_position);

        let pointer = this.nav_display_bearing_to_pointer(wp_bearing);

        this.nav_display_pointer(pointer);

    } // end nav_display_update()

    // On power up, this routine will set up the this.nav_display_flightplan array
    // If an MSFS flightplan is loaded, this routine will pick up the waypoints on successive update cycles
    nav_display_flightplan_update() {
        if (this.power_switched && this.power_status) {
            this.nav_display_flightplan_active = SimVar.GetSimVarValue("C:fs9gps:FlightPlanIsActiveFlightPlan","bool");
            this.nav_display_wp_index = 0;
            if (this.nav_display_flightplan_active) {
                this.nav_display_flightplan_count = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointsNumber", "number");
                this.nav_display_flightplan_index = 0;
                // Request first waypoint
                SimVar.SetSimVarValue("C:fs9gps:FlightPlanWaypointIndex", "number", 0);
            } else { // No flightplan, so use current position
                this.nav_display_flightplan[0] = {
                    position: this.nav_display_get_position(),
                    name: "HOME",
                    alt_m: SimVar.GetSimVarValue("GROUND ALTITUDE", "meters"),
                    type: 5
                }
            }
            // If flightplan is active, then flag request pending for the next update cycle
            this.nav_display_flightplan_request = this.nav_display_flightplan_active;
            return; // By returning now we ensure the check below is delayed until the next update cycle
        }

        // If we have a pending FlightPlanWaypointIndex update, collect the data
        if (this.nav_display_flightplan_request) {
            let wp = {
                position: { lat: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointLatitude", "degrees"),
                            lng: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointLongitude", "degrees")
                },
                name: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointIdent", "string"),
                alt_m: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointAltitude", "meters"),
                type: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointType", "number")
            }

            // Fix up WP altitude if included in waypoint name
            let alt_index = wp.name.lastIndexOf("+");
            if (alt_index > 0) {
                let alt_f = parseInt(wp.name.slice(alt_index+1),10); // parse integer base 10
                if (!isNaN(alt_f)) {
                    wp.alt_m = alt_f / this.M_TO_F;
                    wp.name = wp.name.slice(0,alt_index);
                }
            }
            // Store waypoing in our flighplan, unless it's a bullshit MSFS inserted waypoint
            if (! wp.name.startsWith("TIMECRUIS") && ! wp.name.startsWith("TIMEDSCNT") ) {
                // Add this waypoint to our internal this.nav_display_flightplan array
                this.nav_display_flightplan.push(wp);
            }

            this.nav_display_flightplan_index += 1;

            // If we have more flightplan waypoints to collect, then request the next
            if (this.nav_display_flightplan_index < this.nav_display_flightplan_count) {
                // Request next waypoint
                SimVar.SetSimVarValue("C:fs9gps:FlightPlanWaypointIndex", "number", this.nav_display_flightplan_index);
                // leave this.nav_display_flightplan_request true
            } else {
                this.nav_display_flightplan_request = false;
            }
        }
    }

    nav_display_update_top_str() {
        // Display next WP id
        //let wp_id = SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
        let top_str = (this.nav_display_wp_index == 0 ? "" : this.nav_display_wp_index+".")+this.nav_display_wp_name;
        if (top_str.length > 8) {
            this.nav_display_top_el.style["font-size"] = Math.floor(22 * (8/top_str.length))+"px";
        } else {
            this.nav_display_top_el.style["font-size"] = "22px";
        }
        this.nav_display_top_el.innerHTML = top_str;
    }

    // Return { lat: lng: } for current position of aircraft
    nav_display_get_position() {
        return { lat: SimVar.GetSimVarValue("A:PLANE LATITUDE", "radians") * this.RAD_TO_DEG,
                 lng: SimVar.GetSimVarValue("A:PLANE LONGITUDE", "radians") * this.RAD_TO_DEG
        };
    }

    // Given a waypoint bearing, calculate the -3..+3 value for the pointer
    nav_display_bearing_to_pointer(wp_bearing) {
        // Get aircraft heading either from compass (if slow/stationary) or GPS TRACK
        let aircraft_heading;
        if (this.airspeed_ms < 15) {
            aircraft_heading = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "radians") * this.RAD_TO_DEG;
        } else {
            aircraft_heading = SimVar.GetSimVarValue("GPS GROUND TRUE TRACK","radians") * this.RAD_TO_DEG;
        }

        // Convert aircraft_heading and wp_bearing into +180..-180 degrees offset of WP from aircraft heading (turn_deg)
        let heading_delta_deg =  aircraft_heading - wp_bearing;

        let left_deg;
        let right_deg;
        if (heading_delta_deg > 0) {
            left_deg = heading_delta_deg;
            right_deg = 360 - heading_delta_deg;
        } else {
            left_deg = heading_delta_deg + 360;
            right_deg = -heading_delta_deg;
        }
        let turn_deg;
        if (left_deg < right_deg) turn_deg = -left_deg;
        else turn_deg = right_deg;

        // Convert turn_deg to pointer value -3..+3 - note this is NOT linear.
        let pointer;
        if (turn_deg < -50) pointer = -3;
        else if (turn_deg < -25) pointer = -2;
        else if (turn_deg < -8) pointer = -1;
        else if (turn_deg < 8) pointer = 0;
        else if (turn_deg < 25) pointer = 1;
        else if (turn_deg < 50) pointer = 2;
        else pointer = 3;

        return pointer;
    }

    // Update the nav display direction pointer arrows
    // pointer is -3 .. +3 (any other number means all)
    nav_display_pointer(pointer) {
        this.nav_display_previous_pointer_el.style.display = "none";
        let pointer_id = this.nav_display_pointer_to_id(pointer);
        this.nav_display_previous_pointer_el = this.querySelector(pointer_id);
        this.nav_display_previous_pointer_el.style.display = "block";
    }

    // Convert a pointer number -4 .. +4 into an element id to display.
    // Note current range is -3..+3 but kept this way for possible future update.
    nav_display_pointer_to_id(pointer) {
        if (pointer == -4) {
            return "#nav_display_4L";
        } else if (pointer == -3) {
            return "#nav_display_3L";
        } else if (pointer == -2) {
            return "#nav_display_2L";
        } else if (pointer == -1) {
            return "#nav_display_1L";
        } else if (pointer == 0) {
            return "#nav_display_zero";
        } else if (pointer == 1) {
            return "#nav_display_1R";
        } else if (pointer == 2) {
            return "#nav_display_2R";
        } else if (pointer == 3) {
            return "#nav_display_3R";
        } else if (pointer == 4) {
            return "#nav_display_4R";
        }
        return "#nav_display_all";
    }

    // ************************************************************************************************************************
    // ********** DEBUG              ******************************************************************************************
    // ************************************************************************************************************************

    debug_init() {
        // Debug refresh timer and smoothed flight parameters
        this.debug_var = ["A:LIGHT CABIN","bool"]; // the variable we use to enable/disable debug
        this.debug_count = 16; // number of debug elements
        this.debug = []; // variables set in gauges to be displayed in debug areas on panel
        this.debug_update_time_s = this.time_s;
        this.debug_enabled = false;
        this.debug_glide_ratio = 50;
        this.debug_airspeed_ms = 0;
    }


    debug_update() {
        if (this.debug_update_time_s == null) {
            this.debug_init();
            return;
        }
        // Debug display properties (heavily smoothed)
        let airspeed_true_ms = SimVar.GetSimVarValue("AIRSPEED TRUE", "knots") / this.MS_TO_KT;
        this.debug_airspeed_ms = 0.98 * this.debug_airspeed_ms + 0.02 * airspeed_true_ms;
        // Guard against divide by zero and irrelevant high L/D in lift
        let glide_ratio = this.te_raw_ms < -0.1 ? -airspeed_true_ms / this.te_raw_ms : 99;
        this.debug_glide_ratio = 0.98 * this.debug_glide_ratio + 0.02 * Math.min(glide_ratio, 99);

        // We will use Landing Light ON/OFF (Ctrl L) to toggle this debug info
        let debug_enable = SimVar.GetSimVarValue(this.debug_var[0], this.debug_var[1]) ? true : false;

        if (debug_enable) {
            this.debug_enabled = true;
        } else {
            if (this.debug_enabled) {
                this.debug_enabled = false;
                this.debug_clear();
            }
            return;
        }

        /* DEBUG DISPLAY IN NAV INSTRUMENT ONCE PER 2 SECONDS */
        if (this.time_s - this.debug_update_time_s > 2) {
            this.debug_update_time_s = this.time_s;
            // DEBUG ASI
            //let total_weight = SimVar.GetSimVarValue("A:TOTAL WEIGHT", "kilograms");
            //let netto_ms = SimVar.GetSimVarValue("L:NETTO", "meters per second");

            // ***************
            // ASI DEBUG AREAS
            // ***************

            // ASI
            this.debug[1] = (airspeed_true_ms * this.MS_TO_KPH).toFixed(0); //Math.floor(this.debug_airspeed_ms * this.MS_TO_KPH + 0.5);
            this.debug[2] = "";
            this.debug[3] = "";
            this.debug[4] = (SimVar.GetSimVarValue("GROUND VELOCITY", "knots")/this.MS_TO_KT*this.MS_TO_KPH).toFixed(1);//(SimVar.GetSimVarValue("GPS GROUND TRUE TRACK","radians") * this.RAD_TO_DEG).toFixed(0);

            // nav_display
            this.debug[5] = "";
            this.debug[6] = "";
            this.debug[7] = Math.floor(this.debug_glide_ratio + 0.5);
            this.debug[8] = "";

            // Winter
            this.debug[9] = this.nav_display_flightplan_active ? "FP:ON" : "FP:OFF";
            this.debug[10] = this.nav_display_wp_index;
            this.debug[11] = this.nav_display_flightplan.length;//"";//(SimVar.GetSimVarValue("GPS GROUND TRUE TRACK", "radians") * this.RAD_TO_DEG).toFixed(0);
            let te = this.te_ms; // to shorten next line
            this.debug[12] = ""+(te >= 0 ? "+"+te.toFixed(2) : te.toFixed(2));

            // Cambridge
            this.debug[13] = ""; //typeof this.power_status; // ? "P.ON" : "POW OFF";
            this.debug[14] = "";
            this.debug[15] = this.pause_mode ? "PAUSE" : "";
            this.debug[16] = this.netto_ms.toFixed(2);

            let debug_el;

            for (let i=1;i<=this.debug_count;i++) {
                debug_el = this.querySelector("#debug"+i);
                if (typeof debug_el !== "undefined") {
                    debug_el.style.display = "block";
                    debug_el.style.width = "80px";
                    debug_el.innerHTML = this.debug[i]; //this.netto_ms.toFixed(2);
                }
            }
        }
    } // end debug_update()

    debug_clear() {
        let debug_el;
        for (let i=1;i<=this.debug_count;i++) {
            debug_el = this.querySelector("#debug"+i);
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "none";
            }
        }
    } // end debug_clear
}
registerLivery("gauges_dg808s_panel_2-element", gauges_dg808s_panel_2);
