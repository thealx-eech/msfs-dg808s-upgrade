
class gauges_dg808s_panel_2 extends TemplateElement {

    constructor() {
        super();
        // Constants
        this.MS_TO_KT = 1.94384; // speed conversion consts
        this.MS_TO_KPH = 3.6;
        this.MS_TO_FPS = 3.28084;
        this.MS_TO_FPM = 196.85;

        this.location = "interior";
        this.curTime = 0.0;
        this.bNeedUpdate = false;
        this._isConnected = false;
		this.lastCheck = 0;
        this.climbValues = new Array(30);

        // 'Local' vars used by multiple instruments
        this.time_s = null;
        this.vertical_speed_ms = 0;
        this.airspeed_ms = 0;

        // Total Energy vars
        this.previous_airspeed_ms = 0;
        this.previous_time_s = null;
        this.te_raw_ms = 0;
        this.te_ms = 0;

        // Netto vars
        this.netto_ms = 0;

        // Cruise/climb mode vars (Caambridge vario will switch)
        this.climb_mode = true;

        // Vario Tone vars
        this.vario_tone = 0;
        this.debug_vario_tone_change = true;
        this.vario_tone_inc = 1;

        // Debug refresh timer and smoothed flight parameters
        this.debug_enabled = false;
        this.debug_update_time = null;
        this.debug_glide_ratio = 50;
        this.debug_te_ms = 0;
        this.debug_airspeed_ms = 0;

        // Initialise polar data structure (for speed->sink calculation)
        this.init_polar();
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
        this.update_local_vars();

        this.update_total_energy(); // uses local simvars
        this.update_netto();        // uses total energy
        this.update_winter_vario();
        this.update_vario_tone();
        this.update_asi();
        this.update_cambridge_vario();
        this.update_debug();
    }

    /*playInstrumentSound(soundId) {
        if (this.isElectricityAvailable()) {
            Coherent.call("PLAY_INSTRUMENT_SOUND", soundId);
            return true;
        }
        return false;
    }	*/

    // ************************************************************
    // init_polar()
    // Initializes the this.polar_speed and this.polar_sink arrays.
    // E.g. at 100Kph in still air the DG808S will sink at 0.57 m/s.
    // ************************************************************
    init_polar() {
        this.polar_speed_ref = [ -10, 60, 70, 72,  80, 90, 100, 110, 120, 130, 150, 170,200,210,220,230,300];
        this.polar_sink_ref =  [  10,  3,0.6,0.5,0.48,0.5,0.57,0.61,0.67,0.75,0.98,1.29,1.9,2.3,2.9,3.6,8.5];

        for (let i=0;i<this.polar_speed_ref.length;i++) {
            this.polar_speed_ref[i] = this.polar_speed_ref[i] / this.MS_TO_KPH; // polar speeds in m/s
        }
    }

    // ************************************************************
    // polar_sink(airspeed m/s) returns sink m/s
    // Interpolates in this.polar_speed_ref / this.polar_sink_ref
    // ************************************************************
    polar_sink(airspeed) {
        //return 0.1234;
        let polar_count = this.polar_speed_ref.length;
        let i = 0;
        // Iterate through 'polar_speed_ref' array until airspeed between [i-1]th and [i]th
        while (i < polar_count && airspeed > this.polar_speed_ref[i]) {
            i++;
        }
        // Check airspeed < lowest value in polar_speed_ref
        if (i == 0) {
            return this.polar_sink_ref[0];
        }

        let airspeed_diff = this.polar_speed_ref[i] - this.polar_speed_ref[i-1];
        let sink_diff = this.polar_sink_ref[i] - this.polar_sink_ref[i-1];
        let speed_ratio = (airspeed - this.polar_speed_ref[i-1]) / airspeed_diff;

        return this.polar_sink_ref[i-1] + sink_diff * speed_ratio;
    }

    // ************************************************************
    // Update 'local' values from Simvars
    // ************************************************************
    update_local_vars() {
        this.airspeed_ms = SimVar.GetSimVarValue("A:AIRSPEED TRUE", "feet per second") / this.MS_TO_FPS;
        this.vertical_speed_ms = SimVar.GetSimVarValue("A:VELOCITY WORLD Y", "feet per second") / this.MS_TO_FPS;
        this.time_s = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");
    }

    // ************************************************************
    // Set "L:TOTAL ENERGY, meters per second"  climb rate
    // ************************************************************
    update_total_energy() {
        let g = 9.81; // Gravitational constant

        // Detect startup and return 0
        if (this.previous_time_s == null) {
            this.previous_airspeed_ms = this.airspeed_ms;
            this.previous_time_s = this.time_s;
            this.te_ms = 0.0;
            // Make initial TE reading zero, will increment from here.
            return 0.0;
        }

        let time_s_delta = this.time_s - this.previous_time_s;
        // Avoid a bad reading or divide-by-zero if this frame is ~same as previous
        if (time_s_delta < 0.0001) {
            return this.te_ms;
        }

        let airspeed_ms_squared_delta = this.airspeed_ms**2 - this.previous_airspeed_ms**2;
        let te_compensation_ms = airspeed_ms_squared_delta / (2 * g * time_s_delta);
        this.te_raw_ms = this.vertical_speed_ms + te_compensation_ms;

        // smoothing TE
        let te_ms = 0.96 * this.te_ms + 0.04 * this.te_raw_ms;

        // OK we've calculated te_ms, so can store the current time/speed/height for the next update
        this.previous_airspeed_ms = this.airspeed_ms;
        this.previous_time_s = this.time_s;

        // Set the local var and SimVar
        this.te_ms = te_ms;
        SimVar.SetSimVarValue("L:TOTAL ENERGY", "meters per second", te_ms);
    }

    // **************************************************************************************************
    // Set "L:NETTO, meters per second"  climb rate
    // Netto is simple the TE climb rate with the natural sink of the aircraft (from the polar) removed
    // **************************************************************************************************

    update_netto() {
        // Uses this.te_ms
        // Uses this.airspeed_ms
        // Uses this.netto_ms

        // Note polar_sink is POSITIVE
        //Set the local var and SimVar
        this.netto_ms = this.te_ms + this.polar_sink(this.airspeed_ms);
        SimVar.SetSimVarValue("L:NETTO", "meters per second", this.netto_ms);
    }

    // ***************************************************************
    // Update cruise/climb mode (Audio will switch Netto -> TE)
    // ***************************************************************
    update_climb_mode() {
        // Uses this.climb_mode
        this.climb_mode = true;
    }

    //******************************************************************************
    //************** VARIO TONE       **********************************************
    //******************************************************************************
    update_vario_tone() {
		if (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") && SimVar.GetSimVarValue("A:GENERAL ENG MASTER ALTERNATOR:1", "bool")) {
            let climb_rate = this.climb_mode ? this.te_ms : this.netto_ms;
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", climb_rate * this.MS_TO_FPM);
        } else {
            SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", 0);
        }
    }

    //******************************************************************************
    //************** WINTER VARIO     **********************************************
    //******************************************************************************
    update_winter_vario() {
        const min = -5;    // m/s
        const max = 5;     // m/s
        const max_degrees = 135;
		/* VSI_VSI_NEEDLE_0 */
		var vsi_vsi_needle_0 = this.querySelector("#vsi_vsi_needle_0");
		if (typeof vsi_vsi_needle_0 !== "undefined") {
            let te_ms = this.te_ms;
            // Limit range to -5 .. +5 m/s
            te_ms = Math.min(te_ms, max);
            te_ms = Math.max(te_ms, min);
            //let ExpressionResult = SimVar.GetSimVarValue("L:TOTAL ENERGY", "knots"); /* PARSED FROM "(A:Vertical speed,feet per minute) 0.00988 *" */
            //let ExpressionResult = 2; // TE Climb rate in knots
			let transform = 'rotate('+(te_ms / max * max_degrees)+'deg)';
		    vsi_vsi_needle_0.style.transform = transform;
		}
    }

    // *************************************************************************************************************************
    // ************* AIRSPEED INDICATOR                       ******************************************************************
    // *************************************************************************************************************************
    update_asi() {
		/* ASI_ASI_NEEDLE_0 */
		var asi_asi_needle_0 = this.querySelector("#asi_asi_needle_0");
		if (typeof asi_asi_needle_0 !== "undefined") {
		  var transform = '';

		  {

			var ExpressionResult = (SimVar.GetSimVarValue("AIRSPEED INDICATED", "knots")); /* PARSED FROM "(A:Airspeed select indicated or true,knots)" */
			var Minimum = 0.000;
			ExpressionResult = Math.max(ExpressionResult, Minimum);
			var Maximum = 160.000;
			ExpressionResult = Math.min(ExpressionResult, Maximum);
			var PointsTo = 180;
			var NonlinearityTable = [
				[0, 541.941486390914],
				[15, 541.941486390914],
				[20, 560.146264446839],
				[40, 649.490530507975],
				[60, 743.898791636159],
				[80, 818.412345290427],
				[100, 884.611532167241],
				[120, 943.970845195694],
				[160, 1043.22281389057],
			];

			if (NonlinearityTable.length > 0) {
			    Minimum = NonlinearityTable[0][0];
			    ExpressionResult = Math.max(ExpressionResult, Minimum);
			    Maximum = NonlinearityTable[NonlinearityTable.length-1][0];
			    ExpressionResult = Math.min(ExpressionResult, Maximum);
				var prevAngle = 0;
				var result = 0;
				var prevVal = Minimum;
				for (var i = 0; i < NonlinearityTable.length; i++) {
					var NonlinearityEntry = NonlinearityTable[i][0];
					var NonlinearityAngle = NonlinearityTable[i][1];
					if (NonlinearityAngle < 0) { NonlinearityAngle += 360 };
					if (ExpressionResult == NonlinearityEntry || prevAngle == NonlinearityAngle && ExpressionResult > prevVal && ExpressionResult < NonlinearityEntry) {
						result = NonlinearityAngle;
						break;
					}
					else if (ExpressionResult > prevVal && ExpressionResult < NonlinearityEntry ) {
						var coef = 1 - (NonlinearityEntry - ExpressionResult) / (NonlinearityEntry - prevVal);

						result = prevAngle + coef * (NonlinearityAngle - prevAngle);
						break;
					}
					prevVal = NonlinearityEntry;
					prevAngle = NonlinearityAngle;
				}

				if (Minimum >= 0)
					while (result < 0)
						result += 360;

				transform += 'rotate(' + (result + PointsTo) + 'deg) ';
			}

		  }
		  if (transform != '') asi_asi_needle_0.style.transform = transform;

		}
    } // end update_asi()

    // *************************************************************************************************************************
    // ************* CAMBRIDGE VARIO                          ******************************************************************
    // *************************************************************************************************************************
    update_cambridge_vario() {
		let needle = this.querySelector("#cambridge_needle");
        const min = -5;    // m/s
        const max = 5;     // m/s
        const max_degrees = 179;
		if (typeof needle !== "undefined") {
            let netto_ms = this.netto_ms;
            // Limit range to -5 .. +5 m/s
            netto_ms = Math.min(netto_ms, max);
            netto_ms = Math.max(netto_ms, min);
			let transform = 'rotate('+(netto_ms / max * max_degrees)+'deg)';
		    needle.style.transform = transform;
		}
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

    update_debug() {
        let time_s = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");

        if (this.debug_update_time == null) {
            this.debug_update_time = time_s;
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
        if (time_s - this.debug_update_time > 2) {
            this.debug_update_time = time_s;
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
                let te = this.debug_te_ms; // to shorten next line
                debug_el.innerHTML = "  "+(te >= 0 ? "+"+te.toFixed(2) : te.toFixed(2));
            }
            // DEBUG ASI
            //let total_weight = SimVar.GetSimVarValue("A:TOTAL WEIGHT", "kilograms");
            //let netto_ms = SimVar.GetSimVarValue("L:NETTO", "meters per second");
            debug_el = this.querySelector("#debug_asi_1");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.style.width = "80px";
                debug_el.innerHTML = this.netto_ms.toFixed(2);
            }
            let jet_thrust = SimVar.GetSimVarValue("A:GENERAL ENG THROTTLE LEVER POSITION:1", "percent");
            debug_el = this.querySelector("#debug_asi_2");
            if (typeof debug_el !== "undefined") {
                debug_el.style.display = "block";
                debug_el.innerHTML = ""+jet_thrust.toFixed(1);
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
