class gauges_dg808s_panel_2 extends TemplateElement {
    constructor() {
        super();
        this.location = "interior";
        this.curTime = 0.0;
        this.bNeedUpdate = false;
        this._isConnected = false;
		this.lastCheck = 0;
		this.climbValues = new Array(30);
    }
    get templateID() { return "gauges_dg808s_panel_2"; }
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
    Update() {
		this.updateInstruments();
    }
    /*playInstrumentSound(soundId) {
        if (this.isElectricityAvailable()) {
            Coherent.call("PLAY_INSTRUMENT_SOUND", soundId);
            return true;
        }
        return false;
    }	*/
    updateInstruments() {

       // TAXI LIGHTS CONTROL
       if (SimVar.GetSimVarValue("IS GEAR RETRACTABLE", "Boolean")) {
         var gears_extracted = SimVar.GetSimVarValue("GEAR HANDLE POSITION", "Boolean");
         if (SimVar.GetSimVarValue("LIGHT TAXI", "bool") && !gears_extracted)
            SimVar.SetSimVarValue("K:TOGGLE_TAXI_LIGHTS", "bool", false)
         else if (!SimVar.GetSimVarValue("LIGHT TAXI", "bool") && gears_extracted)
            SimVar.SetSimVarValue("K:TOGGLE_TAXI_LIGHTS", "bool", true)
       }
	   
	   // VARIO TOTAL ENERGY reading = (h2 - h1) + ((v + a)2 - v2)/(2 * g)
		var airspeed = SimVar.GetSimVarValue("AIRSPEED TRUE", "meters per second");
		var acceleration = SimVar.GetSimVarValue("ACCELERATION BODY Z", "meters per second squared");
		var verticalSpeed = SimVar.GetSimVarValue("VERTICAL SPEED", "meters per second");
		var total_energy = verticalSpeed + (Math.pow(airspeed + acceleration, 2) - Math.pow(airspeed,2)) / (2 * 9.81);

		SimVar.SetSimVarValue("L:TOTAL ENERGY", "meters per second", total_energy);

		// VARIO TONE
		if (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") && SimVar.GetSimVarValue("A:GENERAL ENG MASTER ALTERNATOR:1", "bool"))
			SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", total_energy * 196.85)
		else
			SimVar.SetSimVarValue("L:VARIO_TONE", "feet per minute", 0)

		// VARIO AVERAGE SINK
		if (SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") && this.lastCheck != parseInt(SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds"))) {
			this.lastCheck = parseInt(SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds"));
			
			this.climbValues.pop();
			this.climbValues.unshift(total_energy * 1.94);
		}

		/* DISPLAY VARIO ELEMENTS */
		this.querySelector(".battery_required").style.display = SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") ? "block" : "none";
		
		/* ASI_ASI_NEEDLE_0 */
		var asi_asi_needle_0 = this.querySelector("#asi_asi_needle_0");
		if (typeof asi_asi_needle_0 !== "undefined") {
		  var transform = '';

		  {

			var ExpressionResult = (SimVar.GetSimVarValue("AIRSPEED TRUE", "knots")); /* PARSED FROM "(A:Airspeed select indicated or true,knots)" */
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
		  if (transform != '')
		    asi_asi_needle_0.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_ALTITUDE_0 */
		var variometer_variometer_label_altitude_0 = this.querySelector("#variometer_variometer_label_altitude_0");
		if (typeof variometer_variometer_label_altitude_0 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_altitude_0.style.transform = transform; 

		}

		var variometer_variometer_value_altitude_0 = this.querySelector("#variometer_variometer_value_altitude_0");
		if (typeof variometer_variometer_value_altitude_0 !== "undefined") {
			//variometer_variometer_value_altitude_0.innerHTML = SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet").toFixed(0);
		}


		/* VARIOMETER_VARIOMETER_LABEL_AVERAGER_1 */
		var variometer_variometer_label_averager_1 = this.querySelector("#variometer_variometer_label_averager_1");
		if (typeof variometer_variometer_label_averager_1 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_averager_1.style.transform = transform; 

		}
		
		var variometer_variometer_label_average_increasing_2 = this.querySelector("#variometer_variometer_label_average_increasing_2");
		var variometer_variometer_label_average_decreasing_3 = this.querySelector("#variometer_variometer_label_average_decreasing_3");
		var variometer_variometer_value_averager_1 = this.querySelector("#variometer_variometer_value_averager_1");
		if (typeof variometer_variometer_value_averager_1 !== "undefined") {
			var average = 0;
			for (i = 0; i < this.climbValues.length; i++) {
				if (typeof this.climbValues[i] !== "undefined") {
					average += this.climbValues[i];
				}
			}
			
			average /= 30;
			
			variometer_variometer_label_average_increasing_2.style.display = average > 0.1 ? "block" : "none"; 
			variometer_variometer_label_average_decreasing_3.style.display = average < 0.1 ? "block" : "none"; 

			variometer_variometer_value_averager_1.innerHTML = average.toFixed(1);
		}

		/* VARIOMETER_VARIOMETER_LABEL_PUSH_SPEED_UP_4 */
		var variometer_variometer_label_push_speed_up_4 = this.querySelector("#variometer_variometer_label_push_speed_up_4");
		if (typeof variometer_variometer_label_push_speed_up_4 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_push_speed_up_4.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_PULL_SLOW_DOWN_5 */
		var variometer_variometer_label_pull_slow_down_5 = this.querySelector("#variometer_variometer_label_pull_slow_down_5");
		if (typeof variometer_variometer_label_pull_slow_down_5 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_pull_slow_down_5.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_CIRCLING_MODE_6 */
		var variometer_variometer_label_circling_mode_6 = this.querySelector("#variometer_variometer_label_circling_mode_6");
		if (typeof variometer_variometer_label_circling_mode_6 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_circling_mode_6.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_BALLAST_QUANTITY_7 */
		var variometer_variometer_label_ballast_quantity_7 = this.querySelector("#variometer_variometer_label_ballast_quantity_7");
		if (typeof variometer_variometer_label_ballast_quantity_7 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_ballast_quantity_7.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_PERCENT_SYMBOL_8 */
		var variometer_variometer_label_percent_symbol_8 = this.querySelector("#variometer_variometer_label_percent_symbol_8");
		if (typeof variometer_variometer_label_percent_symbol_8 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_percent_symbol_8.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_FEET_9 */
		var variometer_variometer_label_feet_9 = this.querySelector("#variometer_variometer_label_feet_9");
		if (typeof variometer_variometer_label_feet_9 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_feet_9.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_LABEL_METRES_10 */
		var variometer_variometer_label_metres_10 = this.querySelector("#variometer_variometer_label_metres_10");
		if (typeof variometer_variometer_label_metres_10 !== "undefined") {
		  var transform = '';

		  if (transform != '')
		    variometer_variometer_label_metres_10.style.transform = transform; 

		}

		/* VARIOMETER_VARIOMETER_NEEDLE_11 */
		var variometer_variometer_needle_11 = this.querySelector("#variometer_variometer_needle_11");
		if (typeof variometer_variometer_needle_11 !== "undefined") {
		  var transform = '';

		  {
			var ExpressionResult = 	SimVar.GetSimVarValue("ELECTRICAL MASTER BATTERY", "boolean") ? SimVar.GetSimVarValue("L:TOTAL ENERGY", "knots") : 0;
			var Minimum = -10.000;
			ExpressionResult = Math.max(ExpressionResult, Minimum);
			var Maximum = 10.000;
			ExpressionResult = Math.min(ExpressionResult, Maximum);
			var PointsTo = 90;
			var NonlinearityTable = [
				[-10, 451.123864221415],
				[0, 629.131514590992],
				[10, 811.123864221415],
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
		  if (transform != '')
		    variometer_variometer_needle_11.style.transform = transform; 

		}

		/* VSI_VSI_NEEDLE_0 */
		var vsi_vsi_needle_0 = this.querySelector("#vsi_vsi_needle_0");
		if (typeof vsi_vsi_needle_0 !== "undefined") {
		  var transform = '';

		  {

			var ExpressionResult = SimVar.GetSimVarValue("L:TOTAL ENERGY", "knots"); /* PARSED FROM "(A:Vertical speed,feet per minute) 0.00988 *" */
			var Minimum = -10.000;
			ExpressionResult = Math.max(ExpressionResult, Minimum);
			var Maximum = 10.000;
			ExpressionResult = Math.min(ExpressionResult, Maximum);
			var PointsTo = 90;
			var NonlinearityTable = [
				[-10, 493.849319687917],
				[0, 629.421763461094],
				[10, 765.000968406651],
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
		  if (transform != '')
		    vsi_vsi_needle_0.style.transform = transform; 

		}

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

    }
}
registerLivery("gauges_dg808s_panel_2-element", gauges_dg808s_panel_2);
