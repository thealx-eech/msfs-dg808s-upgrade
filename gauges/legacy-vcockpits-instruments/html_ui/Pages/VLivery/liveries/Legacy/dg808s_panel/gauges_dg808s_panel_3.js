class gauges_dg808s_panel_3 extends TemplateElement {
    constructor() {
        super();
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
    }
    get templateID() { return "gauges_dg808s_panel_3"; }
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
        this.global_vars_update();
		this.yawstring_update();
        this.debug_update();
    }

    // ************************************************************
    // Update 'global' values from Simvars
    // ************************************************************
    global_vars_update() {
        this.SLEW_MODE = SimVar.GetSimVarValue("IS SLEW ACTIVE", "bool");
        this.TIME_S = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds");
    }

    // Return different between two 360 deg bearings as +/- 180 deg
    delta_deg(A,B) {
        let diff = B-A;
        if (diff < -180) {
            return 360 - diff;
        } else if (diff > 180) {
            return diff - 360;
        }
        return diff;
    }

    // Get yawstring angle +/- 60 degrees
    get_yawstring_angle_deg() {
        let heading_deg = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "radians") * this.RAD_TO_DEG;
        let ground_speed_kt = Math.max(SimVar.GetSimVarValue("GPS GROUND SPEED", "knots"),1); // Avoid divide by zero
        if (ground_speed_kt <= 1) { // If we're ~stationary, use a simpler calculation
            let wind_direction_deg = SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degrees");
            let delta = this.delta_deg(wind_direction_deg, heading_deg);
            return Math.max(Math.min(delta,60),-60);
        }
        let track_deg = SimVar.GetSimVarValue("GPS GROUND TRUE TRACK","radians") * this.RAD_TO_DEG;
        this.yawstring_delta_deg = this.delta_deg(track_deg, heading_deg);
        let wind_x_kt = SimVar.GetSimVarValue("AIRCRAFT WIND X","knots"); // Note this var does not work at low aircraft speed...
        this.yawstring_crosswind_deg = Math.atan(wind_x_kt/ground_speed_kt)*this.RAD_TO_DEG;

        return Math.max(Math.min(this.yawstring_delta_deg + this.yawstring_crosswind_deg, 60),-60);
    }

    // *************************************************
    // ********** YAWSTRING
    // *************************************************
    yawstring_update() {
		var yawString = this.querySelector("#yawString1");
		if (typeof yawString !== "undefined") {
			var planeDirection = SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "degree");
			var worldVelocityX = SimVar.GetSimVarValue("VELOCITY WORLD X", "knots");
			var worldVelocityZ = SimVar.GetSimVarValue("VELOCITY WORLD Z", "knots");
			var motiondirection = rotate(worldVelocityX, worldVelocityZ, 180 - planeDirection);
			var motionMagnitude = Math.min(Math.pow(Math.pow(motiondirection[0], 2) + Math.pow(motiondirection[1], 2), 0.5), 200);

			var windDirection = (SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degree") - planeDirection) * Math.PI/180;
			var windVelocity = SimVar.GetSimVarValue("AMBIENT WIND VELOCITY", "knots");

			var finalX = motiondirection[0] * (1.1 - Math.pow(motionMagnitude / 200, 0.5)) + windVelocity * Math.sin(windDirection);
			var finalZ = motiondirection[1] * (1.1 - Math.pow(motionMagnitude / 200, 0.5)) + windVelocity * Math.cos(windDirection) - 1;

			var finalMagnitude = Math.pow(Math.pow(finalX, 2) + Math.pow(finalZ, 2), 0.5);

            var finalAngle = this.get_yawstring_angle_deg(); // returns Yawstring angle +/- 60 deg

			var stringElements = this.querySelectorAll(".yawStringEl");
			var i = 1.0;
			var totalAngle = 0.0;
			stringElements.forEach(function(stringElement) {
				//var velocityModifier = Math.pow(Math.max(0, (200 - finalMagnitude) / 200), (11.0 - i));
				var reaction = finalMagnitude * Math.pow(i / 10.0,2) / 10.0;// * velocityModifier;
				var currAngle = stringElement.style.transform;

				if ((currAngle) == "")
					currAngle = 0;
				else
				  currAngle = currAngle.replace('rotate(','').replace('deg)','');

				currAngle = parseFloat(currAngle);

				if (currAngle > 360.0)
					currAngle -= 360.0;
				if (currAngle < -360.0)
					currAngle += 360.0;

				var angleLimit = (11.0 - i) * 2.0;
				var newAngle = currAngle;
				if (totalAngle + currAngle > finalAngle) {
					newAngle -= ((totalAngle + currAngle) - finalAngle) * reaction;
				}
				else if (totalAngle + currAngle <= finalAngle) {
					newAngle += (finalAngle - (totalAngle + currAngle)) * reaction;
				}

				newAngle = Math.min(newAngle, angleLimit);
				newAngle = Math.max(newAngle, - angleLimit);
				console.log(i + " curr" + currAngle + " new" + newAngle);

				stringElement.style.transform  = 'rotate(' + newAngle + 'deg)';

				totalAngle += newAngle;

				i++;
			});

			//var PointsTo = 0;
			//yawString.style.transform  += 'rotate(' + (finalAngle) + 'deg)';

		  //if (transform != '')
		    //yawString.style.transform = transform;

		}

		function vector(angle, length) {
			angle = angle * Math.PI / 180;
			return [length * Math.cos(angle), length * Math.sin(angle)]
		}

		function rotate(x, y, angle) {
			var radians = (Math.PI / 180) * angle,
			cos = Math.cos(radians),
			sin = Math.sin(radians),
			nx = (cos * x) + (sin * y),
			ny = (cos * y) - (sin * x);
			return [-nx, -ny];
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

            this.debug[1] = "";//(SimVar.GetSimVarValue("GPS GROUND TRUE TRACK","radians") * this.RAD_TO_DEG).toFixed(2);
            this.debug[2] = "";//(SimVar.GetSimVarValue("PLANE HEADING DEGREES TRUE", "radians") * this.RAD_TO_DEG).toFixed(2);
            this.debug[3] = "";//SimVar.GetSimVarValue("AIRCRAFT WIND X","knots");
            this.debug[4] = "";//SimVar.GetSimVarValue("AMBIENT WIND DIRECTION", "degrees").toFixed(1);

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
registerLivery("gauges_dg808s_panel_3-element", gauges_dg808s_panel_3);
