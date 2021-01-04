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
*/

class gauges_dg808s_panel_2 extends TemplateElement {

    constructor() {
        super();
        // Constants
        this.MS_TO_KT = 1.94384; // speed conversion consts
        this.MS_TO_KPH = 3.6;
        this.M_TO_F = 3.28084; // meter to foot
        this.MS_TO_FPM = 196.85; // meter per second to foot per minute

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
    // LOCAL FUNCTIONS - called from the update loop
    //********************************************************************

    Update() {
        // Collect simvar data used by multiple instruments
        this.global_vars_update();

        this.total_energy_update();
        this.netto_update();
        this.climb_mode_update();
        this.vario_tone_update();

        // Now update instruments
        this.winter_update();
        this.asi_update();
        this.variometer_update();
        this.nav_display_update();

        // This debug routine paints var values onto panel, toggled with 'L' (lights) key.
        this.debug_update();
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

    // **********************************************************************************************************************
    // **********************************************************************************************************************
    // ******* SOME UTILITY FUNCTIONS     ***********************************************************************************
    // **********************************************************************************************************************
    // **********************************************************************************************************************

    // degrees to radians
    rad(x) {
          return x * Math.PI / 180;
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
        this.time_s = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");
        this.airspeed_ms = SimVar.GetSimVarValue("A:AIRSPEED INDICATED", "feet per second") / this.M_TO_F;
        this.vertical_speed_ms = SimVar.GetSimVarValue("A:VELOCITY WORLD Y", "feet per second") / this.M_TO_F;
        this.altitude_m = SimVar.GetSimVarValue("A:INDICATED ALTITUDE", "feet") / this.M_TO_F;
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
    }

    total_energy_update() {
        let g = 9.81; // Gravitational constant

        // Detect startup and return 0
        if (this.te_previous_time_s == null) {
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
        let te_compensation_ms = airspeed_ms_squared_delta / (2 * g * time_delta_s);
        this.te_raw_ms = this.vertical_speed_ms + te_compensation_ms;

        // smoothing TE
        let te_ms = 0.98 * this.te_ms + 0.02 * this.te_raw_ms;

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
    //************** VARIO TONE       **********************************************
    //******************************************************************************
    vario_tone_update() {
		if (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") && SimVar.GetSimVarValue("A:GENERAL ENG MASTER ALTERNATOR:1", "bool")) {
            let climb_rate = this.climb_mode ? this.te_ms : this.netto_ms;
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", climb_rate * this.MS_TO_FPM);
        } else {
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", 0);
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
        this.variometer_mode_var = ["LIGHT BEACON ON","boolean"]; // Var to manual switch cruise/climb
        //this.variometer_mode_var = ["VARIOMETER SWITCH","boolean"]; // MSFS not implemented !!
        this.variometer_mode = "AUTO"; // CRUISE / CLIMB / AUTO
        this.variometer_previous_mode = "AUTO";
        this.variometer_previous_switch = SimVar.GetSimVarValue(this.variometer_mode_var[0], this.variometer_mode_var[1]);
        this.variometer_previous_climb_mode = null; // will be boolean true => climb, false => cruise
        this.variometer_average_ms = 0;          // current average reading (m/s)
        this.variometer_mode_time_s = null;      // MSFS timestamp when climb/cruise started
        this.variometer_altitude_start_m = 0;    // start height of cruise or climb
        this.variometer_update_time_s = null;    // time when digits on vario were last updated
        this.variometer_average_cruise_ms = 0;   // rolling average for cruise TE climb/sink value

        // "88" as flaps display
        let flap_display = this.querySelector("#variometer_flap_display");
		if (typeof flap_display !== "undefined") {
            flap_display.innerHTML = "88";
        }

        // "-8.8" as average display, plus BOTH increasing and decreasing indicators
        this.variometer_display_average(-8.8, true, true);
    }


    variometer_update() {
        const POWER_UP_TIME_S = 7; // duration (sec) of full power-up sequence

        // On first update all we do is init()
        if (this.variometer_init_time_s == null) {
            this.variometer_init();
            return;
        }

        // If we're inside the 'power up' time, we just animate the gauge
        if (this.time_s - this.variometer_init_time_s < POWER_UP_TIME_S) {
            const CYCLE_TIME_S = 4;
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
        this.variometer_average_cruise_ms = 0.99 * this.variometer_average_cruise_ms + 0.01 * this.te_ms;

        // On startup write a zero the the averager display
        if (this.variometer_update_time_s == null) {
            this.variometer_display_average(0, false, false); // display 0, no increasing/decreasing indicators
            this.variometer_update_time_s = this.time_s; // Initialize update time
        }

        let vario_climb_mode = this.variometer_update_mode(); // vario_climb_mode will be true/false

        let needle_value = vario_climb_mode ? this.te_ms : this.netto_ms;
        this.variometer_display_needle(needle_value);

        // Detect climb/cruise mode change
        // Also this.variometer_mode will have been set to "CRUISE" | "CLIMB" | "AUTO"
        if (vario_climb_mode != this.variometer_previous_climb_mode ||
                this.variometer_mode != this.variometer_previous_mode) {
            this.variometer_mode_time_s = this.time_s; // store start time of climb or cruise (e.g. for true average climb)
            this.variometer_update_time_s = this.time_s; // Initialize update time
            this.variometer_altitude_start_m = this.altitude_m;
            this.variometer_previous_climb_mode = vario_climb_mode;
            this.variometer_previous_mode = this.variometer_mode;
            this.variometer_average_cruise_ms = 0;

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
            let average_comparator_ms = Math.round(this.variometer_average_ms*10) / 10;
            this.variometer_update_time_s = this.time_s;
            // Calculate averager reading m/s
            if (vario_climb_mode) {
                let climb_duration_s = this.time_s - this.variometer_mode_time_s;
                // avoid divide by zero
                if (climb_duration_s > 2) {
                    // Note we could adjust for Kinetic Energy loss
                    this.variometer_average_ms = (this.altitude_m - this.variometer_altitude_start_m) / climb_duration_s;
                }
            } else { // Cruise mode
                this.variometer_average_ms = this.variometer_average_cruise_ms;
            }

            let current_average = Math.round(this.variometer_average_ms*10) / 10;
            let increasing = current_average > average_comparator_ms;
            let decreasing = current_average < average_comparator_ms;

            this.variometer_display_average(this.variometer_average_ms, increasing, decreasing);
        }

        // Update the flap indicator
        let flap_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
        this.variometer_display_flap(flap_index);
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
        //this.debug4 = return_climb_mode;
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
    variometer_display_average(display_value, increasing, decreasing) {
        // Update averager reading
        let averager_digits_el = this.querySelector("#variometer_averager_digits");
        let averager_decimal_el = this.querySelector("#variometer_averager_decimal");
		if (typeof averager_digits_el !== "undefined" && typeof averager_decimal_el !== "undefined") {
            let v = Math.round(display_value * 10);
            let digits =  Math.trunc(v/10);
            let decimal = Math.abs(v % 10);
            // Note no "-" in front of 0.0 (e.g. from display value -0.04)
            averager_digits_el.innerHTML = (v<=-1 ? "-" : "")+Math.abs(digits);   // [sign+]integer(s)
            averager_decimal_el.innerHTML = ""+decimal;    // tenths
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
        // Display of flap setting name (e.g. "T1")
        let flap_display = this.querySelector("#variometer_flap_display");
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
            //this.debug1 = exact_flap_index.toFixed(2);
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
        this.nav_display_previous_next_var = null;
        this.nav_display_wp_index = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointIndex", "number");
        this.nav_display_wp_count = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointsNumber", "number");
        this.nav_display_previous_pointer_el = this.querySelector("#nav_display_all"); // start with all pointer elements lit
        this.wp_position = null;
    }

    nav_display_update() {

        // Startup
        if (this.nav_display_init_time_s == null) {
            this.nav_display_init();
            return;
        }

        const POWER_UP_TIME_S = 10; // duration (sec) of full power-up sequence

        // If we're inside the 'power up' time, we just animate the gauge
        if (this.time_s - this.nav_display_init_time_s < POWER_UP_TIME_S) {
            const CYCLE_TIME_S = 7;
            const POWER_UP_DELAY_S = POWER_UP_TIME_S - CYCLE_TIME_S;
            // 't' is time within CYCLE_TIME_S
            let t = this.time_s - this.nav_display_init_time_s - POWER_UP_DELAY_S;
            // Do nothing during the power-up delay period
            if (t < 0) {
                return;
            }
            // Sweep needle across full range -4, .. , +4
            let pointer_value = Math.round(4 * Math.sin(t / CYCLE_TIME_S * 2 * Math.PI));
            this.nav_display_pointer(pointer_value);
            return;
        }

        const UPDATE_S = 3; // Update the digits on the display every 3 seconds

        // Detect a nav_display_next_var toggle
        let next_var = SimVar.GetSimVarValue(this.nav_display_next_var[0], this.nav_display_next_var[1]);
        if (next_var != this.nav_display_previous_next_var) {
            // User has toggled nav_display_next_var
            this.nav_display_previous_next_var = next_var; // reset for next toggle
            this.nav_display_wp_index += 1;
            // Increment wp index, rotate back to 0 if at end.
            if (this.nav_display_wp_index == this.nav_display_wp_count) {
                this.nav_display_wp_index = 0;
            }
            SimVar.SetSimVarValue("C:fs9gps:FlightPlanWaypointIndex", "number", this.nav_display_wp_index);

            this.wp_position = { lat: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointLatitude", "degrees"),
                                 lng: SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointLongitude", "degrees")
            };

        }

        // Display next WP id
        let top_el = this.querySelector("#nav_display_top");
        let wp_id = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointIdent", "string");
        //let wp_id = SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
        let top_str = this.nav_display_wp_index+"."+wp_id;
        if (top_str.length > 8) {
            top_el.style["font-size"] = Math.floor(22 * (10/top_str.length))+"px";
        } else {
            top_el.style["font-size"] = "22px";
        }
        top_el.innerHTML = top_str;

        // Display elevation of WP
        let middle_el = this.querySelector("#nav_display_middle");
        //let height = Math.floor(SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointAltitude", "meters") * this.M_to_F);
        let height = Math.floor(SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointAltitude", "meters") * this.M_TO_F);
        middle_el.innerHTML = height;

        let position = { lat: SimVar.GetSimVarValue("GPS POSITION LAT", "degrees"),
                         lng: SimVar.GetSimVarValue("GPS POSITION LON", "degrees")
        };

        // Display distance to WP
        let bottom_el = this.querySelector("#nav_display_bottom");
        // Calculate distance to next WP, in Km and create display string e.g. "10" or "4.5"
        let distance = this.get_distance(position, this.wp_position) / 1000; //SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointDistance", "meters") / 1000; // distance to WP in Km
        if (distance >= 10) { // Above 10Km, just show whole Km
            distance = Math.floor(distance + 0.5);
        } else {             // Below 10Km, show decimals
            distance = Math.floor(distance * 10 + 0.5) / 10;
        }
        if (distance == 0) {
            distance = "0.0";
        }
        //let distance = Math.floor(SimVar.GetSimVarValue("GPS WP DISTANCE", "meters") / 1000);
        bottom_el.innerHTML = distance;

        let bearing = this.get_bearing(position, this.wp_position);
        this.debug2 = this.wp_position.lat.toFixed(4);//bearing.toFixed(1);
        this.debug3 = this.wp_position.lng.toFixed(4);//bearing.toFixed(1);
        this.debug4 = bearing.toFixed(1);
        this.nav_display_pointer(2);


    } // end update_nav()

    // Update the nav display direction pointer arrows
    // pointer is -4 .. +4 (any other number means all)
    nav_display_pointer(pointer) {
        this.nav_display_previous_pointer_el.style.display = "none";
        let pointer_id = this.nav_display_pointer_to_id(pointer);
        this.nav_display_previous_pointer_el = this.querySelector(pointer_id);
        this.nav_display_previous_pointer_el.style.display = "block";
    }

    // Convert a pointer number -4 .. +4 into an element id to display.
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
        this.debug_update_time_s = this.time_s;
        this.debug_enabled = false;
        this.debug_glide_ratio = 50;
        this.debug_te_ms = 0;
        this.debug_airspeed_ms = 0;
        this.debug_var = ["A:LIGHT CABIN","bool"]; // the variable we use to enable/disable debug
    }


    debug_update() {
        if (this.debug_update_time_s == null) {
            this.debug_init();
            return;
        }

        // Debug display properties (heavily smoothed)
        this.debug_airspeed_ms = 0.98 * this.debug_airspeed_ms + 0.02 * this.airspeed_ms;
        this.debug_te_ms = 0.98 * this.debug_te_ms + 0.02 * this.te_raw_ms;
        // Guard against divide by zero and irrelevant high L/D in lift
        let glide_ratio = this.te_raw_ms < -0.1 ? -this.airspeed_ms / this.te_raw_ms : 99;
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

            this.debug1 = Math.floor(this.debug_airspeed_ms * this.MS_TO_KPH + 0.5);
            let debug_el = this.querySelector("#debug1");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style.width = "80px";
                debug_el.innerHTML = this.debug1; //this.netto_ms.toFixed(2);
            }

            //let jet_thrust = SimVar.GetSimVarValue("A:GENERAL ENG THROTTLE LEVER POSITION:1", "percent");
            //this.debug2 = SimVar.GetSimVarValue(this.variometer_mode_var[0], this.variometer_mode_var[1]) ? "ON" : "OFF";
            //this.debug2 = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointIndex", "number")+"/"+
            //    SimVar.GetSimVarValue("C:fs9gps:FlightPlanwaypointsNumber", "number");
            debug_el = this.querySelector("#debug2");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug2;
            }

            //this.debug3 = SimVar.GetSimVarValue("A:AIRCRAFT WIND Y", "knots").toFixed(2);
            //this.debug3 = SimVar.GetSimVarValue("GPS WP NEXT ALT", "meters");
            //this.debug3 = SimVar.GetSimVarValue("C:fs9gps:FlightPlanWaypointAltitude", "meters").toFixed(0);
            debug_el = this.querySelector("#debug3");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug3;
            }
            //this.debug4 = "Y";
            debug_el = this.querySelector("#debug4");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug4;
            }

            // ***********************
            // NAV_DISPLAY DEBUG AREAS
            // ***********************

            // DEBUG GLIDE RATIO (max 99)
            this.debug5 = "";
            debug_el = this.querySelector("#debug5");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.height = "30px";
                debug_el.style.width = "30px";
                debug_el.style.color = "white";
                debug_el.innerHTML = this.debug5;
            }
            // DEBUG AIRSPEED KPH
            this.debug6 = ""; //SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
            debug_el = this.querySelector("#debug6");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "24px";
                debug_el.style.color = "white";
                debug_el.style.height = "24px";
                debug_el.innerHTML = this.debug6;
            }
            // DEBUG FLAPS INDEX
            //For flight model testing
            let flaps_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
            this.debug7 = Math.floor(this.debug_glide_ratio + 0.5);
            debug_el = this.querySelector("#debug7");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.color = "blue";
                debug_el.style.height = "30px";
                debug_el.style.width = "10px";
                //debug_el.style["font-family"] = "Roboto-Regular";
                debug_el.innerHTML = this.debug7;
            }
            // DEBUG TOTAL ENERGY SINK
            let te = this.te_ms; // to shorten next line
            this.debug8 = ""+(te >= 0 ? "+"+te.toFixed(2) : te.toFixed(2));
            debug_el = this.querySelector("#debug8");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.color = "white";
                debug_el.style.height = "36px";
                debug_el.innerHTML = this.debug8;
            }
        }
    } // end update_debug

    debug_clear() {
        let debug_el = this.querySelector("#debug1");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug2");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug3");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug4");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug5");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug6");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug7");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug8");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
    } // end debug_clear
}
registerLivery("gauges_dg808s_panel_2-element", gauges_dg808s_panel_2);
