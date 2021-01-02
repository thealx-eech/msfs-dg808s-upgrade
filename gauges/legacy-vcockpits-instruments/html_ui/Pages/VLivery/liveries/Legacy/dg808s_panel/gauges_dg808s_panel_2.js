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

        this.debug1 = this.netto_ms.toFixed(2);
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

        // LIGHT BEACON ON => CLIMB mode
        if (SimVar.GetSimVarValue("A:LIGHT BEACON ON","boolean")) {
            this.climb_mode = true;
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
        this.debug4 = this.climb_mode_bank_rad.toFixed(4);
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
        // Variometer (i.e. Cambridge) vars
        this.variometer_previous_climb_mode = null; // will be boolean true => climb, false => cruise
        this.variometer_average_ms = 0;          // current average reading (m/s)
        this.variometer_mode_time_s = null;      // MSFS timestamp when climb/cruise started
        this.variometer_altitude_start_m = 0;    // start height of cruise or climb
        this.variometer_update_time_s = null;    // time when digits on vario were last updated
        this.variometer_average_cruise_ms = 0;   // rolling average for cruise TE climb/sink value
        this.variometer_init_time_s = this.time_s;

        // "88" as flaps display
        let flap_display = this.querySelector("#variometer_flap_display");
		if (typeof flap_display !== "undefined") {
            flap_display.innerHTML = "88";
        }

        // "-8.8" as average display, plus BOTH increasing and decreasing indicators
        this.variometer_display_average(-8.8, true, true);
    }


    variometer_update() {
        // Uses:
        //    this.variometer_average_ms   -- current average reading (m/s)
        //    this.variometer_mode_time_s -- MSFS timestamp when climb/cruise started
        //    this.variometer_altitude_start_m -- start height of cruise or climb
        //    this.variometer_update_time_s -- time when digits on vario were last updated
        //    this.variometer_previous_climb_mode = null; // will be boolean true => climb, false => cruise
        //    this.variometer_average_cruise_ms -- rolling average for cruise value
        //    this.altitude_m -- global var
        //    this.variometer_init_time_s  -- controls power on mode (show all indicators)

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
            let t = this.time_s - this.variometer_init_time_s - POWER_UP_DELAY_S;
            // Do nothing during the power-up delay period
            if (t < 0) {
                return;
            }
            // cycle the vario needle 0 .. -10 .. + 10 .. 0
            let needle_value = 0;
            if (t < CYCLE_TIME_S / 4) {
                needle_value = -5 * t / (CYCLE_TIME_S / 4);
            } else if (t >= CYCLE_TIME_S / 4 && t < CYCLE_TIME_S * 3 / 4) {
                needle_value = -5 + 10 * (t - CYCLE_TIME_S / 4) / (CYCLE_TIME_S / 2);
            } else {
                needle_value = 5 - 5 * (t - CYCLE_TIME_S * 3 / 4) / (CYCLE_TIME_S / 4);
            }
            this.variometer_display_needle(needle_value);
            return;
        }

        const UPDATE_S = 3; // Update the digits on the display every 3 seconds

        let needle_value = this.climb_mode ? this.te_ms : this.netto_ms;
        this.variometer_display_needle(needle_value);

        // Update basic rolling average of TE climb/sink
        this.variometer_average_cruise_ms = 0.99 * this.variometer_average_cruise_ms + 0.01 * this.te_ms;

        // On startup write a zero the the averager display
        if (this.variometer_update_time_s == null) {
            this.variometer_display_average(0, false, false); // display 0, no increasing/decreasing indicators
            this.variometer_update_time_s = this.time_s; // Initialize update time
        }

        // Detect climb/cruise mode change. Update circling indicator
        if (this.climb_mode != this.variometer_previous_climb_mode) { // always true on startup
            this.variometer_mode_time_s = this.time_s; // store start time of climb or cruise (e.g. for true average climb)
            this.variometer_update_time_s = this.time_s; // Initialize update time
            this.variometer_altitude_start_m = this.altitude_m;
            this.variometer_previous_climb_mode = this.climb_mode;

            // Set/hide circling indicator
            let variometer_circling_el = this.querySelector("#variometer_circling");
            if (this.climb_mode) {
                variometer_circling_el.style.display = "block";
            } else {
                variometer_circling_el.style.display = "none";
                this.variometer_average_cruise_ms = 0;
            }
        }

        // Update the digits on the vario display (e.g. averager)
        if (this.time_s - this.variometer_update_time_s > UPDATE_S) {
            let average_comparator_ms = Math.round(this.variometer_average_ms*10) / 10;
            this.variometer_update_time_s = this.time_s;
            // Calculate averager reading m/s
            if (this.climb_mode) {
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

    //******************************************************************************
    //************** NAV INSTRUMENT     ********************************************
    //******************************************************************************
    update_nav(){

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_GO_OUT_0 */
		var nav_display_button_nav_display_go_out_0 = this.querySelector("#nav_display_button_nav_display_go_out_0");
		if (typeof nav_display_button_nav_display_go_out_0 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_go_out_0.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_GO_IN_1 */
		var nav_display_button_nav_display_go_in_1 = this.querySelector("#nav_display_button_nav_display_go_in_1");
		if (typeof nav_display_button_nav_display_go_in_1 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_go_in_1.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_go_in_1.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_POWER_OUT_2 */
		var nav_display_button_nav_display_power_out_2 = this.querySelector("#nav_display_button_nav_display_power_out_2");
		if (typeof nav_display_button_nav_display_power_out_2 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_power_out_2.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_POWER_IN_3 */
		var nav_display_button_nav_display_power_in_3 = this.querySelector("#nav_display_button_nav_display_power_in_3");
		if (typeof nav_display_button_nav_display_power_in_3 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_power_in_3.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_power_in_3.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_RIGHT_OUT_4 */
		var nav_display_button_nav_display_page_right_out_4 = this.querySelector("#nav_display_button_nav_display_page_right_out_4");
		if (typeof nav_display_button_nav_display_page_right_out_4 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_page_right_out_4.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_RIGHT_IN_5 */
		var nav_display_button_nav_display_page_right_in_5 = this.querySelector("#nav_display_button_nav_display_page_right_in_5");
		if (typeof nav_display_button_nav_display_page_right_in_5 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_page_right_in_5.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_page_right_in_5.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_DOWN_OUT_6 */
		var nav_display_button_nav_display_page_down_out_6 = this.querySelector("#nav_display_button_nav_display_page_down_out_6");
		if (typeof nav_display_button_nav_display_page_down_out_6 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_page_down_out_6.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_DOWN_IN_7 */
		var nav_display_button_nav_display_page_down_in_7 = this.querySelector("#nav_display_button_nav_display_page_down_in_7");
		if (typeof nav_display_button_nav_display_page_down_in_7 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_page_down_in_7.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_page_down_in_7.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_UP_OUT_8 */
		var nav_display_button_nav_display_page_up_out_8 = this.querySelector("#nav_display_button_nav_display_page_up_out_8");
		if (typeof nav_display_button_nav_display_page_up_out_8 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_page_up_out_8.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_UP_IN_9 */
		var nav_display_button_nav_display_page_up_in_9 = this.querySelector("#nav_display_button_nav_display_page_up_in_9");
		if (typeof nav_display_button_nav_display_page_up_in_9 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_page_up_in_9.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_page_up_in_9.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_LEFT_OUT_10 */
		var nav_display_button_nav_display_page_left_out_10 = this.querySelector("#nav_display_button_nav_display_page_left_out_10");
		if (typeof nav_display_button_nav_display_page_left_out_10 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    nav_display_button_nav_display_page_left_out_10.style.transform = transform;

		}

		/* NAV_DISPLAY_BUTTON_NAV_DISPLAY_PAGE_LEFT_IN_11 */
		var nav_display_button_nav_display_page_left_in_11 = this.querySelector("#nav_display_button_nav_display_page_left_in_11");
		if (typeof nav_display_button_nav_display_page_left_in_11 !== "undefined") {
		  var transform = '';

		  nav_display_button_nav_display_page_left_in_11.style.display = "block";

		  if (transform != '')
		    nav_display_button_nav_display_page_left_in_11.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_12 */
		var nav_display_GaugeText_12 = this.querySelector("#nav_display_GaugeText_12");
		if (typeof nav_display_GaugeText_12 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_12.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 0 ) ? "block" : "none";

			nav_display_GaugeText_12.innerHTML = SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? "NAV TO:" + SimVar.GetSimVarValue("GPS WP NEXT ID", "string") :  "NO ACTIVE WP" ;

		  if (transform != '')
		    nav_display_GaugeText_12.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_13 */
		var nav_display_GaugeText_13 = this.querySelector("#nav_display_GaugeText_13");
		if (typeof nav_display_GaugeText_13 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_13.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 0 ) ? "block" : "none";

			nav_display_GaugeText_13.innerHTML = "";//( (SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "boolean")) ).toString() + "{if}" + ( ( ( 1 < -180 ) ?  1 :  ( ( 0 > 180 ) ?  1 : 0 ) ) ).toString() + "  " + ( ( ( 0 < -45 ) ?  '<' :  '' ) ).toString() + "((G:Var1) -25 < if{ '<' } els{ '' } )%!1s!" + ( ( ( 0 < -15 ) ?  '<' :  '' ) ).toString() + "((G:Var1) -10 < if{ '<' } els{ '' } )%!1s!" + ( ( ( 0 < -5 ) ?  '<' :  '' ) ).toString() + "|" + ( ( ( 0 > 5 ) ?  '>' :  '' ) ).toString() + "((G:Var1) 10 > if{ '>' } els{ '' } )%!1s!" + ( ( ( 0 > 15 ) ?  '>' :  '' ) ).toString() + "((G:Var1) 25 > if{ '>' } els{ '' } )%!1s!" + ( ( ( 0 > 45 ) ?  '>' :  '' ) ).toString() + "{end}" ;

		  if (transform != '')
		    nav_display_GaugeText_13.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_14 */
		var nav_display_GaugeText_14 = this.querySelector("#nav_display_GaugeText_14");
		if (typeof nav_display_GaugeText_14 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_14.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 0 ) ? "block" : "none";

			nav_display_GaugeText_14.innerHTML = "BRG:" + ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? Math.round( (SimVar.GetSimVarValue("GPS WP BEARING", "degrees")) ).toString() : "" ) + "TRK:" + Math.round( (SimVar.GetSimVarValue("GPS GROUND MAGNETIC TRACK", "degree")) ).toString() ;

		  if (transform != '')
		    nav_display_GaugeText_14.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_15 */
		var nav_display_GaugeText_15 = this.querySelector("#nav_display_GaugeText_15");
		if (typeof nav_display_GaugeText_15 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_15.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 0 ) ? "block" : "none";

			nav_display_GaugeText_15.innerHTML = "DIST:" + ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? ( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 1 ) ?  (SimVar.GetSimVarValue("GPS WP DISTANCE", "nautical mile")) :  (SimVar.GetSimVarValue("GPS WP DISTANCE", "kilometers")) ) ).toFixed(1).toString() + ( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 1 ) ?  'NM' :  'KM' ) ).toString() : "" ) ;

		  if (transform != '')
		    nav_display_GaugeText_15.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_16 */
		var nav_display_GaugeText_16 = this.querySelector("#nav_display_GaugeText_16");
		if (typeof nav_display_GaugeText_16 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_16.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 1 ) ? "block" : "none";

			nav_display_GaugeText_16.innerHTML = "WPT ETE";

		  if (transform != '')
		    nav_display_GaugeText_16.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_17 */
		var nav_display_GaugeText_17 = this.querySelector("#nav_display_GaugeText_17");
		if (typeof nav_display_GaugeText_17 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_17.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 1 ) ? "block" : "none";

			nav_display_GaugeText_17.innerHTML = "NAV TO:" + ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? ( SimVar.GetSimVarValue("GPS WP NEXT ID", "string") ).toString() : "" ) ;

		  if (transform != '')
		    nav_display_GaugeText_17.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_18 */
		var nav_display_GaugeText_18 = this.querySelector("#nav_display_GaugeText_18");
		if (typeof nav_display_GaugeText_18 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_18.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 1 ) ? "block" : "none";

			nav_display_GaugeText_18.innerHTML = "ETE:" + Math.round( (SimVar.GetSimVarValue("GPS WP ETE", "minutes")) ).toString() + " MINS" ;

		  if (transform != '')
		    nav_display_GaugeText_18.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_19 */
		var nav_display_GaugeText_19 = this.querySelector("#nav_display_GaugeText_19");
		if (typeof nav_display_GaugeText_19 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_19.style.display = "block";

			nav_display_GaugeText_19.innerHTML = ( SimVar.GetSimVarValue("fs9gps:FlightPlanWaypointIdent", "string") ).toString() ;

		  if (transform != '')
		    nav_display_GaugeText_19.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_20 */
		var nav_display_GaugeText_20 = this.querySelector("#nav_display_GaugeText_20");
		if (typeof nav_display_GaugeText_20 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_20.style.display = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") && !(SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean")) ? "block" : "none";

			nav_display_GaugeText_20.innerHTML = ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? "NAV TO:" + SimVar.GetSimVarValue("GPS WP NEXT ID", "string") : "NO ACTIVE WP" ) ;

		  if (transform != '')
		    nav_display_GaugeText_20.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_21 */
		var nav_display_GaugeText_21 = this.querySelector("#nav_display_GaugeText_21");
		if (typeof nav_display_GaugeText_21 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_21.style.display = "none"//1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) ? "block" : "none";

			nav_display_GaugeText_21.innerHTML = "LAT:" + ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? ( ( ( (SimVar.GetSimVarValue("GPS WP NEXT LAT", "degrees")) > 0 ) ?  'N' :  'S' ) ).toString() + ( Math.abs((SimVar.GetSimVarValue("GPS WP NEXT LAT", "degrees"))) ).toFixed(4).toString() : "" );

		  if (transform != '')
		    nav_display_GaugeText_21.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_22 */
		var nav_display_GaugeText_22 = this.querySelector("#nav_display_GaugeText_22");
		if (typeof nav_display_GaugeText_22 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_22.style.display = "none";//1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) ? "block" : "none";

			nav_display_GaugeText_22.innerHTML = "LON:" + ( SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? ( ( ( (SimVar.GetSimVarValue("GPS WP NEXT LON", "degrees")) > 0 ) ?  'W' :  'E' ) ).toString() + ( Math.abs((SimVar.GetSimVarValue("GPS WP NEXT LON", "degrees"))) ).toFixed(4).toString() : "");

		  if (transform != '')
		    nav_display_GaugeText_22.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_23 */
		var nav_display_GaugeText_23 = this.querySelector("#nav_display_GaugeText_23");
		if (typeof nav_display_GaugeText_23 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_23.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) ? "block" : "none";

			nav_display_GaugeText_23.innerHTML = "EL:" + ( (SimVar.GetSimVarValue("GPS IS ACTIVE WAY POINT", "bool") ? Math.round( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 2 ) ?  (SimVar.GetSimVarValue("GPS WP NEXT ALT", "feet")) :  (SimVar.GetSimVarValue("GPS WP NEXT ALT", "meters")) ) ).toString() : "" )) + "SP:" + Math.round( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 1 ) ?  (SimVar.GetSimVarValue("GPS GROUND SPEED", "knots")) :  (SimVar.GetSimVarValue("GPS GROUND SPEED", "kph")) ) ).toString() ;

		  if (transform != '')
		    nav_display_GaugeText_23.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_24 */
		var nav_display_GaugeText_24 = this.querySelector("#nav_display_GaugeText_24");
		if (typeof nav_display_GaugeText_24 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_24.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 3 ) ? "block" : "none";

			nav_display_GaugeText_24.innerHTML = "LOCAL WIND";

		  if (transform != '')
		    nav_display_GaugeText_24.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_25 */
		var nav_display_GaugeText_25 = this.querySelector("#nav_display_GaugeText_25");
		if (typeof nav_display_GaugeText_25 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_25.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 3 ) ? "block" : "none";

			nav_display_GaugeText_25.innerHTML = "FROM:" + ( !SimVar.GetSimVarValue("SIM ON GROUND", "bool") ? Math.round( ((SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degree")) - (SimVar.GetSimVarValue("MAGVAR", "degree")) + 360) % 360 ).toString() + "(MAG)" : "") ;

		  if (transform != '')
		    nav_display_GaugeText_25.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_26 */
		var nav_display_GaugeText_26 = this.querySelector("#nav_display_GaugeText_26");
		if (typeof nav_display_GaugeText_26 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_26.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 3 ) ? "block" : "none";

			nav_display_GaugeText_26.innerHTML = "AT:" + (!SimVar.GetSimVarValue("SIM ON GROUND", "bool") ? Math.round( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 1 ) ?  (SimVar.GetSimVarValue("AMBIENT WIND VELOCITY", "knots")) :  (SimVar.GetSimVarValue("AMBIENT WIND VELOCITY", "m/s")) ) ).toString() + ( ( ( (SimVar.GetSimVarValue("UNITS OF MEASURE", "enum")) < 1 ) ?  'KTS' :  'MPS' ) ).toString() : "") ;

		  if (transform != '')
		    nav_display_GaugeText_26.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_27 */
		var nav_display_GaugeText_27 = this.querySelector("#nav_display_GaugeText_27");
		if (typeof nav_display_GaugeText_27 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_27.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 3 ) ? "block" : "none";

			nav_display_GaugeText_27.innerHTML = "REL WIND:" + ( !(SimVar.GetSimVarValue("SIM ON GROUND", "bool")) ? Math.round( Math.floor(((SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degree")) - (SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degrees")) + 360) % 360) ).toString() : "" ) ;

		  if (transform != '')
		    nav_display_GaugeText_27.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_28 */
		var nav_display_GaugeText_28 = this.querySelector("#nav_display_GaugeText_28");
		if (typeof nav_display_GaugeText_28 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_28.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 4 ) ? "block" : "none";

			nav_display_GaugeText_28.innerHTML = "CHRONOMETER";

		  if (transform != '')
		    nav_display_GaugeText_28.style.transform = transform;

		}

		/* NAV_DISPLAY_GAUGETEXT_29 */
		var nav_display_GaugeText_29 = this.querySelector("#nav_display_GaugeText_29");
		if (typeof nav_display_GaugeText_29 !== "undefined") {
		  var transform = '';

		  nav_display_GaugeText_29.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !(1 * (SimVar.GetSimVarValue("PARTIAL PANEL NAV", "boolean"))) && ( 0 == 4 ) ? "block" : "none";

			nav_display_GaugeText_29.innerHTML = "ET:" + Math.round( Math.floor(((SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds")) - 0) / 3600) ).toString() + ":" + Math.round( Math.floor(((SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds")) - 0) % 3600 / 60) ).toString() + ":" + Math.round( ((SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds")) - 0) % 60 ).toString() ;

		  if (transform != '')
		    nav_display_GaugeText_29.style.transform = transform;

		}

    } // end update_nav()

    // ***********************************************************************************************************
    // ********** DEBUG              *****************************************************************************
    // ***********************************************************************************************************

    debug_init() {
        // Debug refresh timer and smoothed flight parameters
        this.debug_update_time_s = this.time_s;
        this.debug_enabled = false;
        this.debug_glide_ratio = 50;
        this.debug_te_ms = 0;
        this.debug_airspeed_ms = 0;
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
        let debug_enable = SimVar.GetSimVarValue("A:LIGHT CABIN","bool") ? true : false;

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
            // DEBUG GLIDE RATIO (max 99)
            var debug_el = this.querySelector("#nav_display_GaugeText_12");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.left = "8px";
                debug_el.style.top = "26px";
                debug_el.style.height = "30px";
                debug_el.style.width = "36px";
                debug_el.style["text-align"] = "right";
                debug_el.style.color = this.debug_glide_ratio == 99 ? "pink" :"black";
                debug_el.innerHTML = Math.floor(this.debug_glide_ratio + 0.5);
            }
            // DEBUG AIRSPEED KPH
            debug_el = this.querySelector("#nav_display_GaugeText_13");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "34px";
                debug_el.style.left = "48px";
                debug_el.style.top = "18px";
                debug_el.style.color = "white";
                debug_el.style.height = "36px";
                debug_el.style.width = "60px";
                debug_el.style["text-align"] = "right";
                debug_el.innerHTML = Math.floor(this.debug_airspeed_ms * this.MS_TO_KPH + 0.5);
            }
            // DEBUG FLAPS INDEX
            //For flight model testing
            let flaps_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
            debug_el = this.querySelector("#nav_display_GaugeText_14");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.left = "8px";
                debug_el.style.top = "60px";
                debug_el.style.color = "blue";
                debug_el.style.height = "30px";
                //debug_el.style["font-family"] = "Roboto-Regular";
                debug_el.innerHTML = ""+flaps_index;
            }
            // DEBUG TOTAL ENERGY SINK
            debug_el = this.querySelector("#nav_display_GaugeText_19");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style["font-size"] = "28px";
                debug_el.style.left = "28px";
                debug_el.style.top = "55px";
                debug_el.style.color = "white";
                debug_el.style.height = "36px";
                debug_el.style.width = "76px";
                debug_el.style["text-align"] = "right";
                let te = this.te_ms; // to shorten next line
                debug_el.innerHTML = "  "+(te >= 0 ? "+"+te.toFixed(2) : te.toFixed(2));
            }
            // DEBUG ASI
            //let total_weight = SimVar.GetSimVarValue("A:TOTAL WEIGHT", "kilograms");
            //let netto_ms = SimVar.GetSimVarValue("L:NETTO", "meters per second");
            debug_el = this.querySelector("#debug_asi_1");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style.width = "80px";
                debug_el.innerHTML = this.debug1; //this.netto_ms.toFixed(2);
            }

            //let jet_thrust = SimVar.GetSimVarValue("A:GENERAL ENG THROTTLE LEVER POSITION:1", "percent");
            this.debug2 = SimVar.GetSimVarValue("A:LIGHT BEACON ON", "boolean");
            debug_el = this.querySelector("#debug_asi_2");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug2; //beacon_lights ? "ON" : "OFF";
            }

            this.debug3 = SimVar.GetSimVarValue("A:AIRCRAFT WIND Y", "knots").toFixed(2);
            debug_el = this.querySelector("#debug_asi_3");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug3;
            }
            //this.debug4 = "Y";
            debug_el = this.querySelector("#debug_asi_4");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = this.debug4;
            }
        }
    } // end update_debug

    debug_clear() {
        var debug_el = this.querySelector("#nav_display_GaugeText_12");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#nav_display_GaugeText_13");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#nav_display_GaugeText_14");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#nav_display_GaugeText_19");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug_asi_1");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
        debug_el = this.querySelector("#debug_asi_2");
        if (typeof debug_el !== "undefined") {
            debug_el.style.display = "none";
        }
    } // end debug_clear
}
registerLivery("gauges_dg808s_panel_2-element", gauges_dg808s_panel_2);
