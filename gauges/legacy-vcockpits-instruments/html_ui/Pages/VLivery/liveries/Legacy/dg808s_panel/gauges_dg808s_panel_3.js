class gauges_dg808s_panel_3 extends TemplateElement {
    constructor() {
        super();
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

		var yawString = this.querySelector("#yawString1");
		var velocityMark = this.querySelector("#velocityMark");
		var windMark = this.querySelector("#windMark");
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
			var finalAngle = Math.atan2(finalZ, finalX) * 180 / Math.PI - 90;
			
			velocityMark.style.transform = 'translate(' + motiondirection[0].toString() + 'px, ' + motiondirection[1].toString() + 'px)';
			windMark.style.transform = 'translate('+(windVelocity * Math.sin(windDirection))+'px, '+(windVelocity * Math.cos(windDirection))+'px)';
			
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
}
registerLivery("gauges_dg808s_panel_3-element", gauges_dg808s_panel_3);
