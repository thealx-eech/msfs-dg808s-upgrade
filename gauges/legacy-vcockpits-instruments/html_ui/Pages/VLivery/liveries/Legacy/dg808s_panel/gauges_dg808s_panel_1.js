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
        this.update_altimeter();
        this.update_turn_and_bank();
        this.update_outside_air_temp();
        this.update_electrical_buttons();
        this.update_radio();
        this.update_transponder();
        this.update_compass();
        this.update_label();
    }

    /*playInstrumentSound(soundId) {
        if (this.isElectricityAvailable()) {
            Coherent.call("PLAY_INSTRUMENT_SOUND", soundId);
            return true;
        }
        return false;
    }	*/

    //***********************************************************************************
    //***********  ALTIMETER  ***********************************************************
    //***********************************************************************************
    update_altimeter() {

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
    update_turn_and_bank() {
		/* TURN_BANK_TURN_BANK_OFF_FLAG_0 */
		var turn_bank_turn_bank_off_flag_0 = this.querySelector("#turn_bank_turn_bank_off_flag_0");
		if (typeof turn_bank_turn_bank_off_flag_0 !== "undefined") {
		  var transform = '';

		  turn_bank_turn_bank_off_flag_0.style.display = !(!(1) * (SimVar.GetSimVarValue("TURN INDICATOR SWITCH", "boolean"))) ? "block" : "none";

		  if (transform != '')
		    turn_bank_turn_bank_off_flag_0.style.transform = transform;

		}

		/* TURN_BANK_TURN_BANK_BALL_OVERLAY_1 */
		var turn_bank_turn_bank_ball_overlay_1 = this.querySelector("#turn_bank_turn_bank_ball_overlay_1");
		if (typeof turn_bank_turn_bank_ball_overlay_1 !== "undefined") {
		  var transform = '';

		  {
             /* PARSED FROM "(A:TURN COORDINATOR BALL,percent)" */
			var ExpressionResult = Math.min(30, Math.max(-30 , -(SimVar.GetSimVarValue("PLANE BANK DEGREES", "degree")))) / 30 * 100;
			var Minimum = 0;
			var Maximum = 999999999;
			var NonlinearityTable = [
				[-100,13.000,32.000],
				[0,35.000,35.000],
				[100,57.000,32.000],
			];

			if (NonlinearityTable.length > 0) {
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

		  }
		  if (transform != '')
		    turn_bank_turn_bank_ball_overlay_1.style.transform = transform;

		}

		/* TURN_BANK_TURN_BANK_NEEDLE_2 */
		var turn_bank_turn_bank_needle_2 = this.querySelector("#turn_bank_turn_bank_needle_2");
		if (typeof turn_bank_turn_bank_needle_2 !== "undefined") {
		  var transform = '';

		  {
            /* PARSED FROM " (A:Delta Heading Rate, rpm) 0.44 * (A:ELECTRICAL MASTER BATTERY,bool) *" */
			var ExpressionResult = (-SimVar.GetSimVarValue("TURN INDICATOR RATE", "degree per second")) * 60 / 360 * 0.44 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean"));
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
    update_outside_air_temp() {
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
    update_electrical_buttons() {

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
    update_radio() {
		/* RADIO_RADIO_KNOB_POWER_AND_VOLUME_0 */
		var radio_radio_knob_power_and_volume_0 = this.querySelector("#radio_radio_knob_power_and_volume_0");
		if (typeof radio_radio_knob_power_and_volume_0 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    radio_radio_knob_power_and_volume_0.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_STANDBY_OUT_1 */
		var radio_radio_button_standby_out_1 = this.querySelector("#radio_radio_button_standby_out_1");
		if (typeof radio_radio_button_standby_out_1 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    radio_radio_button_standby_out_1.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_STANDBY_IN_2 */
		var radio_radio_button_standby_in_2 = this.querySelector("#radio_radio_button_standby_in_2");
		if (typeof radio_radio_button_standby_in_2 !== "undefined") {
		  var transform = '';

		  radio_radio_button_standby_in_2.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    radio_radio_button_standby_in_2.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_MODE_OUT_3 */
		var radio_radio_button_mode_out_3 = this.querySelector("#radio_radio_button_mode_out_3");
		if (typeof radio_radio_button_mode_out_3 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    radio_radio_button_mode_out_3.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_MODE_IN_4 */
		var radio_radio_button_mode_in_4 = this.querySelector("#radio_radio_button_mode_in_4");
		if (typeof radio_radio_button_mode_in_4 !== "undefined") {
		  var transform = '';

		  radio_radio_button_mode_in_4.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    radio_radio_button_mode_in_4.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_SQUELCH_OUT_5 */
		var radio_radio_button_squelch_out_5 = this.querySelector("#radio_radio_button_squelch_out_5");
		if (typeof radio_radio_button_squelch_out_5 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    radio_radio_button_squelch_out_5.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_SQUELCH_IN_6 */
		var radio_radio_button_squelch_in_6 = this.querySelector("#radio_radio_button_squelch_in_6");
		if (typeof radio_radio_button_squelch_in_6 !== "undefined") {
		  var transform = '';

		  radio_radio_button_squelch_in_6.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    radio_radio_button_squelch_in_6.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_STO_OUT_7 */
		var radio_radio_button_sto_out_7 = this.querySelector("#radio_radio_button_sto_out_7");
		if (typeof radio_radio_button_sto_out_7 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    radio_radio_button_sto_out_7.style.transform = transform;

		}

		/* RADIO_RADIO_BUTTON_STO_IN_8 */
		var radio_radio_button_sto_in_8 = this.querySelector("#radio_radio_button_sto_in_8");
		if (typeof radio_radio_button_sto_in_8 !== "undefined") {
		  var transform = '';

		  radio_radio_button_sto_in_8.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    radio_radio_button_sto_in_8.style.transform = transform;

		}

		/* RADIO_TRANSMISSION_INDICATION_9 */
		var radio_Transmission_Indication_9 = this.querySelector("#radio_Transmission_Indication_9");
		if (typeof radio_Transmission_Indication_9 !== "undefined") {
		  var transform = '';

		  radio_Transmission_Indication_9.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) * !((SimVar.GetSimVarValue("COM TRANSMIT:1", "boolean"))) ? "block" : "none";

			radio_Transmission_Indication_9.innerHTML = "<";

		  if (transform != '')
		    radio_Transmission_Indication_9.style.transform = transform;

		}

		/* RADIO_ACTIVE_FREQUENCY_10 */
		var radio_Active_Frequency_10 = this.querySelector("#radio_Active_Frequency_10");
		if (typeof radio_Active_Frequency_10 !== "undefined") {
		  var transform = '';

		  radio_Active_Frequency_10.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) ? "block" : "none";

			radio_Active_Frequency_10.innerHTML = ( (SimVar.GetSimVarValue("COM ACTIVE FREQUENCY:1", "MHz")) ).toFixed(2).toString() ;

		  if (transform != '')
		    radio_Active_Frequency_10.style.transform = transform;

		}

		/* RADIO_STANDBY_FREQUENCY_11 */
		var radio_Standby_Frequency_11 = this.querySelector("#radio_Standby_Frequency_11");
		if (typeof radio_Standby_Frequency_11 !== "undefined") {
		  var transform = '';

		  radio_Standby_Frequency_11.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL COMM:1", "boolean"))) ? "block" : "none";

			radio_Standby_Frequency_11.innerHTML = ( (SimVar.GetSimVarValue("COM STANDBY FREQUENCY:1", "MHz")) ).toFixed(2).toString() ;

		  if (transform != '')
		    radio_Standby_Frequency_11.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  TRANSPONDER  *********************************************************
    //***********************************************************************************
    update_transponder() {
		/* TRANSPONDER_TRANSPONDER_BUTTON_STANDBY_OUT_0 */
		var transponder_transponder_button_standby_out_0 = this.querySelector("#transponder_transponder_button_standby_out_0");
		if (typeof transponder_transponder_button_standby_out_0 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    transponder_transponder_button_standby_out_0.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_STANDBY_IN_1 */
		var transponder_transponder_button_standby_in_1 = this.querySelector("#transponder_transponder_button_standby_in_1");
		if (typeof transponder_transponder_button_standby_in_1 !== "undefined") {
		  var transform = '';

		  transponder_transponder_button_standby_in_1.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    transponder_transponder_button_standby_in_1.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_MODE_OUT_2 */
		var transponder_transponder_button_mode_out_2 = this.querySelector("#transponder_transponder_button_mode_out_2");
		if (typeof transponder_transponder_button_mode_out_2 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    transponder_transponder_button_mode_out_2.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_MODE_IN_3 */
		var transponder_transponder_button_mode_in_3 = this.querySelector("#transponder_transponder_button_mode_in_3");
		if (typeof transponder_transponder_button_mode_in_3 !== "undefined") {
		  var transform = '';

		  transponder_transponder_button_mode_in_3.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    transponder_transponder_button_mode_in_3.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_SQUELCH_OUT_4 */
		var transponder_transponder_button_squelch_out_4 = this.querySelector("#transponder_transponder_button_squelch_out_4");
		if (typeof transponder_transponder_button_squelch_out_4 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    transponder_transponder_button_squelch_out_4.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_SQUELCH_IN_5 */
		var transponder_transponder_button_squelch_in_5 = this.querySelector("#transponder_transponder_button_squelch_in_5");
		if (typeof transponder_transponder_button_squelch_in_5 !== "undefined") {
		  var transform = '';

		  transponder_transponder_button_squelch_in_5.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    transponder_transponder_button_squelch_in_5.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_STO_OUT_6 */
		var transponder_transponder_button_sto_out_6 = this.querySelector("#transponder_transponder_button_sto_out_6");
		if (typeof transponder_transponder_button_sto_out_6 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    transponder_transponder_button_sto_out_6.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_BUTTON_STO_IN_7 */
		var transponder_transponder_button_sto_in_7 = this.querySelector("#transponder_transponder_button_sto_in_7");
		if (typeof transponder_transponder_button_sto_in_7 !== "undefined") {
		  var transform = '';

		  transponder_transponder_button_sto_in_7.style.display = 0 ? "block" : "none";

		  if (transform != '')
		    transponder_transponder_button_sto_in_7.style.transform = transform;

		}

		/* TRANSPONDER_TRANSPONDER_CODE_8 */
		var transponder_Transponder_Code_8 = this.querySelector("#transponder_Transponder_Code_8");
		if (typeof transponder_Transponder_Code_8 !== "undefined") {
		  var transform = '';

		  transponder_Transponder_Code_8.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL TRANSPONDER:1", "boolean"))) ? "block" : "none";

			transponder_Transponder_Code_8.innerHTML = ( 0 ).toString() + "(l0 12 >> 15 &)%!d!" + Math.round( 0 ).toString() + "(l0 4 >> 15 &)%!d!" + Math.round( 0 ).toString() ;

		  if (transform != '')
		    transponder_Transponder_Code_8.style.transform = transform;

		}

		/* TRANSPONDER_MODE_C_ALTITUDE_DISPLAY_9 */
		var transponder_Mode_C_Altitude_Display_9 = this.querySelector("#transponder_Mode_C_Altitude_Display_9");
		if (typeof transponder_Mode_C_Altitude_Display_9 !== "undefined") {
		  var transform = '';

		  transponder_Mode_C_Altitude_Display_9.style.display = 1 * (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean")) * !((SimVar.GetSimVarValue("PARTIAL PANEL TRANSPONDER", "boolean"))) ? "block" : "none";

			transponder_Mode_C_Altitude_Display_9.innerHTML = "F" + Math.round( Math.round(( ( 1 == 2 ) ?  3.048 :  10 ) * ((SimVar.GetSimVarValue("PLANE ALTITUDE", "feet")) / 1000 - (SimVar.GetSimVarValue("SEA LEVEL PRESSURE", "inhg")) + 29.92)) ).toString() ;

		  if (transform != '')
		    transponder_Mode_C_Altitude_Display_9.style.transform = transform;

		}
    }

    //***********************************************************************************
    //***********  COMPASS      *********************************************************
    //***********************************************************************************
    update_compass() {

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
    //***********  LABEL      *********************************************************
    //***********************************************************************************
    update_label() {
        let label = this.querySelector("#label");
		if (typeof label !== "undefined") {
            let flap_index = SimVar.GetSimVarValue("A:FLAPS HANDLE INDEX", "number");
            let flap_name = [ "dummy", "-3", "-2", "-1", "0", "T", "L" ][flap_index];
            label.innerHTML = flap_name;
		}
    }

}

registerLivery("gauges_dg808s_panel_1-element", gauges_dg808s_panel_1);
