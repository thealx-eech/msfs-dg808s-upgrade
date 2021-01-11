class gauges_dg808s_panel_1 extends TemplateElement {

    constructor() {
        super();
        this.location = "interior";
        this.curTime = 0.0;
        this.bNeedUpdate = false;
        this._isConnected = false;
    }
    get templateID() { return "gauges_dg808s_panel_1"; }

    connectedCallback() {
        super.connectedCallback();
        let parsedUrl = new URL(this.getAttribute("Url").toLowerCase());
        let updateLoop = () => {
            if (!this._isConnected)
                return;
            this.Update();
            requestAnimationFrame(updateLoop);
        };
        this._isConnected = true;
        requestAnimationFrame(updateLoop);
    }

    disconnectedCallback() {
    }

    //*************************************************************************
    //********** MSFS Update() Callback ***************************************
    //*************************************************************************
    Update() {
        // Collect simvar data used by multiple instruments
        this.global_vars_update();

        this.altimeter_update();
        this.turn_and_bank_update();
        this.outside_air_temp_update();
        this.electrical_buttons_update();
        this.radio_update();
        this.transponder_update();
        this.compass_update();
        this.trim_update();

        // Debug
        this.debug_update();
    }

    // ************************************************************
    // Update 'global' values from Simvars
    // ************************************************************
    global_vars_update() {
        this.SLEW_MODE = SimVar.GetSimVarValue("IS SLEW ACTIVE", "bool");
        // this.POWER_SWITCHED
        // this.POWER_STATUS
        this.power_update();
        this.TIME_S = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");
    }

    // Set this.POWER_SWITCHED when power CHANGES - note it will go true FOR A SINGLE UPDATE CYCLE
    // Set this.POWER_STATUS to true/false if power is ON/OFF
    power_update() {
        this.POWER_SWITCHED = false;
	    const new_power_status = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") ? true : false;
        if (typeof this.POWER_STATUS === "undefined" ) {
            this.POWER_SWITCHED = true;
        } else if (new_power_status && !this.POWER_STATUS) {
            this.POWER_SWITCHED = true;
        } else if (!new_power_status && this.POWER_STATUS) {
            this.POWER_SWITCHED = true;
        }
        this.POWER_STATUS = new_power_status;
    }

    //***********************************************************************************
    //***********  ALTIMETER  ***********************************************************
    //***********************************************************************************
    altimeter_update() {

        let altitude_feet = SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet");

		/* ALTIMETER_ALTIMETER_KOHLSMAN_STRIP_0 */
		var altimeter_altimeter_kohlsman_strip_0 = this.querySelector("#altimeter_altimeter_kohlsman_strip_0");
		if (typeof altimeter_altimeter_kohlsman_strip_0 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(A:Kohlsman setting hg,inHg) 28.1 - -197 * 3.4 / 0.8 +" */
			var ExpressionResult = ((SimVar.GetSimVarValue("KOHLSMAN SETTING HG", "inches of mercury")) - 28.1) * -197 / 3.4 + 0.8;
			var Minimum = 0;
			var Maximum = 999999999;
			transform += 'translate(' + (ExpressionResult * 0) + 'px, ' + (ExpressionResult * 1) + 'px) ';
		  }
		  if (transform != '')
		    altimeter_altimeter_kohlsman_strip_0.style.transform = transform;

		}

		/* ALTIMETER_ALTIMETER_TEN_THOUSANDS_NEEDLE_1 */
		var altimeter_altimeter_ten_thousands_needle_1 = this.querySelector("#altimeter_altimeter_ten_thousands_needle_1");
		if (typeof altimeter_altimeter_ten_thousands_needle_1 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(P:Units of measure, enum) 2 == if{ (A:Indicated Altitude, meters) } els{ (A:Indicated Altitude, feet) } 100000 / 360 * dgrd" */
            var ExpressionResult = (( ( 1 == 2 ) ?  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "meters")) :  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet")) ) / 100000 * 360)* Math.PI/180;
			var Minimum = 0;
			var Maximum = 999999999;
			var PointsTo = 0;
			transform += 'rotate(' + (ExpressionResult * 180 / Math.PI + PointsTo) + 'deg) ';
		  }
		  if (transform != '')
		    altimeter_altimeter_ten_thousands_needle_1.style.transform = transform;

		}

		/* ALTIMETER_ALTIMETER_THOUSANDS_NEEDLE_2 */
		var altimeter_altimeter_thousands_needle_2 = this.querySelector("#altimeter_altimeter_thousands_needle_2");
		if (typeof altimeter_altimeter_thousands_needle_2 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(P:Units of measure, enum) 2 == if{ (A:Indicated Altitude, meters) } els{ (A:Indicated Altitude, feet) } 10000 / 360 * dgrd" */
			//var ExpressionResult = (( ( 1 == 2 ) ?  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "meters")) :  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet")) ) / 10000 * 360)* Math.PI/180;
            var ExpressionResult  = altitude_feet / 10000 * 360 * Math.PI/180;
			var Minimum = 0;
			var Maximum = 999999999;
			var PointsTo = 0;
			transform += 'rotate(' + (ExpressionResult * 180 / Math.PI + PointsTo) + 'deg) ';
		  }
		  if (transform != '')
		    altimeter_altimeter_thousands_needle_2.style.transform = transform;

		}

		/* ALTIMETER_ALTIMETER_HUNDREDS_NEEDLE_3 */
		var altimeter_altimeter_hundreds_needle_3 = this.querySelector("#altimeter_altimeter_hundreds_needle_3");
		if (typeof altimeter_altimeter_hundreds_needle_3 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(P:Units of measure, enum) 2 == if{ (A:Indicated Altitude, meters) } els{ (A:Indicated Altitude, feet) } 1000 / 360 * 90 + dgrd" */
			var ExpressionResult = (( ( 1 == 2 ) ?  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "meters")) :  (SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet")) ) / 1000 * 360 + 90)* Math.PI/180;
			var Minimum = 0;
			var Maximum = 999999999;
			var PointsTo = 0;
			transform += 'rotate(' + (ExpressionResult * 180 / Math.PI + PointsTo) + 'deg) ';
		  }
		  if (transform != '')
		    altimeter_altimeter_hundreds_needle_3.style.transform = transform;

		}

		/* ALTIMETER_ALTIMETER_KOHLSMAN_KNOB_4 */
		var altimeter_altimeter_kohlsman_knob_4 = this.querySelector("#altimeter_altimeter_kohlsman_knob_4");
		if (typeof altimeter_altimeter_kohlsman_knob_4 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    altimeter_altimeter_kohlsman_knob_4.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  TURN AND BANK   ******************************************************
    //***********************************************************************************
    turn_and_bank_update() {
		/* TURN_BANK_TURN_BANK_OFF_FLAG_0 */
		var turn_bank_turn_bank_off_flag_0 = this.querySelector("#turn_bank_turn_bank_off_flag_0");
		if (typeof turn_bank_turn_bank_off_flag_0 !== "undefined") {
		  turn_bank_turn_bank_off_flag_0.style.display = !(!(1) * (SimVar.GetSimVarValue("TURN INDICATOR SWITCH", "boolean"))) ? "block" : "none";
		}

		/* TURN_BANK_TURN_BANK_BALL_OVERLAY_1 */
		var turn_bank_turn_bank_ball_overlay_1 = this.querySelector("#turn_bank_turn_bank_ball_overlay_1");
		if (typeof turn_bank_turn_bank_ball_overlay_1 !== "undefined") {
			//var ExpressionResult = Math.min(30, Math.max(-30 , -(SimVar.GetSimVarValue("PLANE BANK DEGREES", "degree")))) / 30 * 100;
            var ExpressionResult = SimVar.GetSimVarValue("A:TURN COORDINATOR BALL","number") * 100;
			var Minimum = 0;
			var Maximum = 999999999;
			var NonlinearityTable = [
				[-100,13.000,32.000],
				[0,35.000,35.000],
				[100,57.000,32.000],
			];

		    Minimum = NonlinearityTable[0][0];
		    ExpressionResult = Math.max(ExpressionResult, Minimum);
		    Maximum = NonlinearityTable[NonlinearityTable.length-1][0];
		    ExpressionResult = Math.min(ExpressionResult, Maximum);
			var prevP2 = { x: 0, y: 0 };
			var result = { x: 0, y: 0 };
			var prevVal = Minimum;
			for (var i = 0; i < NonlinearityTable.length; i++) {
				var NonlinearityEntry = NonlinearityTable[i][0];
				var p2 = { x: NonlinearityTable[i][1], y: NonlinearityTable[i][2] };
				if (ExpressionResult == NonlinearityEntry) {
					result = p2;
					break;
				}
				else if (ExpressionResult > prevVal && ExpressionResult < NonlinearityEntry ) {
					var coef = 1 - (NonlinearityEntry - ExpressionResult) / (NonlinearityEntry - prevVal);

					result = { y: prevP2.y + coef * (p2.y - prevP2.y), x: prevP2.x + coef * (p2.x - prevP2.x) };
					break;
				}
				prevVal = NonlinearityEntry;
				prevP2 = p2;
			}

			turn_bank_turn_bank_ball_overlay_1.style.left = result.x + 'px';
			turn_bank_turn_bank_ball_overlay_1.style.top = result.y +'px';
		}

		/* TURN_BANK_TURN_BANK_NEEDLE_2 */
		var turn_bank_turn_bank_needle_2 = this.querySelector("#turn_bank_turn_bank_needle_2");
		if (typeof turn_bank_turn_bank_needle_2 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM " (A:Delta Heading Rate, rpm) 0.44 * (A:ELECTRICAL MASTER BATTERY,bool) *" */
			var ExpressionResult = (SimVar.GetSimVarValue("TURN INDICATOR RATE", "degree per second")) * 60 / 360 * 0.3 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean"));
			var Minimum = -0.400;
			ExpressionResult = Math.max(ExpressionResult, Minimum);
			var Maximum = 0.400;
			ExpressionResult = Math.min(ExpressionResult, Maximum);
			var PointsTo = 0;
			transform += 'rotate(' + (ExpressionResult * 180 / Math.PI + PointsTo) + 'deg) ';
		  }
		  if (transform != '')
		    turn_bank_turn_bank_needle_2.style.transform = transform;

        }
    }

    //***********************************************************************************
    //***********  OUTSIDE AIR TEMP   ***************************************************
    //***********************************************************************************
    outside_air_temp_update() {
		/* OAT_OAT_STRIP_0 */
		var oat_oat_strip_0 = this.querySelector("#oat_oat_strip_0");
		if (typeof oat_oat_strip_0 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(A:AMBIENT TEMPERATURE,Celsius) 75 / 243 * 150.5 -" */
			var ExpressionResult = (SimVar.GetSimVarValue("AMBIENT TEMPERATURE", "celsius")) / 75 * 243 - 150.5;
			var Minimum = 0;
			var Maximum = 999999999;
			transform += 'translate(' + (ExpressionResult * 0) + 'px, ' + (ExpressionResult * 1) + 'px) ';
		  }
		  if (transform != '')
		    oat_oat_strip_0.style.transform = transform;

		}

		/* OAT_OAT_LINE_1 */
		var oat_oat_line_1 = this.querySelector("#oat_oat_line_1");
		if (typeof oat_oat_line_1 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    oat_oat_line_1.style.transform = transform;

		}

		/* OAT_OAT_SHADOW_2 */
		var oat_oat_shadow_2 = this.querySelector("#oat_oat_shadow_2");
		if (typeof oat_oat_shadow_2 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    oat_oat_shadow_2.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  ELECTRICAL BUTTONS   *************************************************
    //***********************************************************************************
    electrical_buttons_update() {

		/* ELECTRICAL_BUTTONS_VARIO_0 */
		var electrical_buttons_VARIO_0 = this.querySelector("#electrical_buttons_VARIO_0");
		if (typeof electrical_buttons_VARIO_0 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    electrical_buttons_VARIO_0.style.transform = transform;

		}

		/* ELECTRICAL_BUTTONS_GYRO_1 */
		var electrical_buttons_GYRO_1 = this.querySelector("#electrical_buttons_GYRO_1");
		if (typeof electrical_buttons_GYRO_1 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    electrical_buttons_GYRO_1.style.transform = transform;

		}

		/* ELECTRICAL_BUTTONS_AVCS_2 */
		var electrical_buttons_AVCS_2 = this.querySelector("#electrical_buttons_AVCS_2");
		if (typeof electrical_buttons_AVCS_2 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    electrical_buttons_AVCS_2.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  RADIO    *************************************************************
    //***********************************************************************************
    radio_update() {
		/* RADIO_TRANSMISSION_INDICATION_9 */
		var radio_Transmission_Indication_9 = this.querySelector("#radio_Transmission_Indication_9");
		if (typeof radio_Transmission_Indication_9 !== "undefined") {
		  radio_Transmission_Indication_9.style.display = (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) * !((SimVar.GetSimVarValue("COM TRANSMIT:1", "boolean"))) ? "block" : "none";
  		  radio_Transmission_Indication_9.innerHTML = "<";
		}

		/* RADIO_ACTIVE_FREQUENCY_10 */
		var radio_Active_Frequency_10 = this.querySelector("#radio_Active_Frequency_10");
		if (typeof radio_Active_Frequency_10 !== "undefined") {
		     radio_Active_Frequency_10.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) ? "block" : "none";
	         radio_Active_Frequency_10.innerHTML = SimVar.GetSimVarValue("COM ACTIVE FREQUENCY:1", "MHz").toFixed(2) ;
		}

		/* RADIO_STANDBY_FREQUENCY_11 */
		var radio_Standby_Frequency_11 = this.querySelector("#radio_Standby_Frequency_11");
		if (typeof radio_Standby_Frequency_11 !== "undefined") {
		  radio_Standby_Frequency_11.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) ? "block" : "none";

			radio_Standby_Frequency_11.innerHTML = SimVar.GetSimVarValue("COM STANDBY FREQUENCY:1", "MHz").toFixed(2) ;
		}
    }

    //***********************************************************************************
    //***********  TRANSPONDER  *********************************************************
    //***********************************************************************************
    transponder_update() {

		/* TRANSPONDER_TRANSPONDER_CODE_8 */
		var transponder_Transponder_Code_8 = this.querySelector("#transponder_Transponder_Code_8");
		if (typeof transponder_Transponder_Code_8 !== "undefined") {
		  transponder_Transponder_Code_8.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL TRANSPONDER:1", "boolean"))) ? "block" : "none";

			transponder_Transponder_Code_8.innerHTML = 7000; // Maybe decode SimVar.GetSimVarValue("TRANSPONDER CODE:1", "number"); ?? FORMAT ??
		}

		/* TRANSPONDER_MODE_C_ALTITUDE_DISPLAY_9 */
		var transponder_Mode_C_Altitude_Display_9 = this.querySelector("#transponder_Mode_C_Altitude_Display_9");
		if (typeof transponder_Mode_C_Altitude_Display_9 !== "undefined") {
		  transponder_Mode_C_Altitude_Display_9.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL TRANSPONDER", "boolean"))) ? "block" : "none";

			transponder_Mode_C_Altitude_Display_9.innerHTML = "F" + Math.round(SimVar.GetSimVarValue("PLANE ALTITUDE","feet") / 100);
		}
    }

    //***********************************************************************************
    //***********  COMPASS      *********************************************************
    //***********************************************************************************
    compass_update() {

		/* COMPASS_COMPASS_STRIP_0 */
		var compass_compass_strip_0 = this.querySelector("#compass_compass_strip_0");
		if (typeof compass_compass_strip_0 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM "(A:Wiskey compass indication degrees,degrees) dnor 244 * 360 / 269 -" */
			var ExpressionResult = (SimVar.GetSimVarValue("PLANE HEADING DEGREES MAGNETIC", "degrees")) * 244 / 360 - 269;
			var Minimum = 0;
			var Maximum = 999999999;
			transform += 'translate(' + (ExpressionResult * 1) + 'px, ' + (ExpressionResult * 0) + 'px) ';
		  }
		  if (transform != '')
		    compass_compass_strip_0.style.transform = transform;

		}

		/* COMPASS_COMPASS_SHADOW_1 */
		var compass_compass_shadow_1 = this.querySelector("#compass_compass_shadow_1");
		if (typeof compass_compass_shadow_1 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    compass_compass_shadow_1.style.transform = transform;

		}

		/* COMPASS_COMPASS_HIGHLIGHT_2 */
		var compass_compass_highlight_2 = this.querySelector("#compass_compass_highlight_2");
		if (typeof compass_compass_highlight_2 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    compass_compass_highlight_2.style.transform = transform;

		}

		/* COMPASS_COMPASS_LUBBER_LINE_3 */
		var compass_compass_lubber_line_3 = this.querySelector("#compass_compass_lubber_line_3");
		if (typeof compass_compass_lubber_line_3 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    compass_compass_lubber_line_3.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  trim      *********************************************************
    //***********************************************************************************

    trim_init() {
        // Enable all variometer display elements
        this.querySelector(".trim_battery_required").style.display = "block";
    }

    trim_update() {
        // Note this.POWER_SWITCHED is always true on startup
        if (this.POWER_SWITCHED) {
            if (this.POWER_STATUS) {
                this.trim_init();
            } else {
                this.querySelector(".trim_battery_required").style.display = "none";
            }
            return;
        }

        // Do nothing if no power
        if (!this.POWER_STATUS) {
            return;
        }

        let trim_gear_down_el = this.querySelector("#trim_gear_down");
		if (typeof trim_gear_down_el !== "undefined") {
            let gear_position = SimVar.GetSimVarValue("A:GEAR HANDLE POSITION", "bool"); // true = GEAR DOWN
            trim_gear_down_el.style.display = gear_position ? "block" : "none";
		}
        let pointer_el = this.querySelector("#trim_pointer");
		if (typeof pointer_el !== "undefined") {
            const SCALE_WIDTH = 80; // pixel width of scale line
            let trim_amount = (-SimVar.GetSimVarValue("A:ELEVATOR TRIM PCT", "number") * SCALE_WIDTH / 2).toFixed(0);
            pointer_el.style.transform = 'translate('+trim_amount+'px)';
		}
    }

    // ************************************************************************************************************************
    // ********** DEBUG              ******************************************************************************************
    // ************************************************************************************************************************

    debug_init() {
        // Debug refresh timer and smoothed flight parameters
        this.debug_var = ["A:LIGHT CABIN","bool"]; // the variable we use to enable/disable debug
        this.debug_count = 4; // number of debug elements
        this.debug = new Array(this.debug_count); // variables set in gauges to be displayed in debug areas on panel
        this.debug_update_time_s = this.TIME_S;
        this.debug_enabled = false;
    }


    debug_update() {
        if (this.debug_update_time_s == null) {
            this.debug_init();
            return;
        }

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
        if (this.TIME_S - this.debug_update_time_s > 2) {
            this.debug_update_time_s = this.TIME_S;

            this.debug[1] = "W";
            this.debug[2] = "X";
            this.debug[3] = "Y";
            this.debug[4] = SimVar.GetSimVarValue("TURN COORDINATOR BALL","number").toFixed(5);

            let debug_el;

            for (let i=1;i<=this.debug_count;i++) {
                debug_el = this.querySelector("#debug"+i);
                if (typeof debug_el !== "undefined") {
                    debug_el.style.display = "block";
                    debug_el.style.width = "80px";
                    debug_el.innerHTML = this.debug[i];
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

registerLivery("gauges_dg808s_panel_1-element", gauges_dg808s_panel_1);
