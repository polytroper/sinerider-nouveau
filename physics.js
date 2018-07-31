/*****************************

- A sledder
- A sine wave function

*****************************/

Math.TAU = Math.PI*2; // for true believers

var snowmanImage = new Image();
snowmanImage.src = "snowman.png";

var canvas = document.getElementById("test");
var ctx = canvas.getContext('2d');

var t = 0;
var t_last = 0;
var tInput = document.getElementById("t");

function TheFunction(x, past){
	var tt = (!past) ? t : t_last;
	var y = Math.sin(x/30)*tt;
	y *= -1; // FLIP UPSIDE DOWN, REMEMBER?
	return y;
}

var sledder = new Sledder();

function update(){

	// Update The Sledder
	sledder.update();

	// T
	t_last = t;
	t = parseFloat(tInput.value);

	/////////////////////////
	// DRAW /////////////////
	/////////////////////////

	ctx.save();
	ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
	ctx.scale(2,2);
	ctx.translate(250,250);

	// Draw the BG
	ctx.strokeStyle = "#ddd";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(-1000,0);
	ctx.lineTo(1000,0);
	ctx.moveTo(0,-1000);
	ctx.lineTo(0,1000);
	ctx.stroke();

	// Draw The Function
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(-1000,0);
	var y;
	for(var x=-250; x<=250; x++){
		y = TheFunction(x);
		ctx.lineTo(x,y);
	}
	ctx.stroke();

	// Draw The Sledder
	sledder.draw(ctx);

	ctx.restore();

	requestAnimationFrame(update);

}
update();

///////////////////////////////////////////
///////////////////////////////////////////
///////////////////////////////////////////

function Sledder(){

	var self = this;

	self.x = -100;
	self.y = -50;
	self.vx = 0;
	self.vy = 0;

	self.rotationVector = {x:0, y:-1};

	var GRAVITY = 0.1;
	
	self.update = function(){

		// Move me
		self.x += self.vx;
		self.y += self.vy;

		// Gravity
		self.vy += GRAVITY;

		// Am I below ground? If so, it's THE REAL PHYSICS TIME
		var gy = TheFunction(self.x);
		var buffer = 0.1;
		if(self.y>=gy-buffer){

			// To ground!
			self.y = gy;

			// Get ground/normal vectors of ground
			var err = 0.01;
			var y1 = TheFunction(self.x-err);
			var y2 = TheFunction(self.x+err);
			var groundVector = {
				x: err*2,
				y: y2-y1
			};
			_turnIntoUnitVector(groundVector); // make this a unit vector...
			
			// normal!
			var normalVector = {
				x: groundVector.y,
				y: -groundVector.x
			}

			// Rotation vector ease to Normal!
			self.rotationVector.x = self.rotationVector.x*0.5 + normalVector.x*0.5;
			self.rotationVector.y = self.rotationVector.y*0.5 + normalVector.y*0.5;
			_turnIntoUnitVector(self.rotationVector);

			// Project Sledder velocity to ground vector
			var scalar = self.vx*groundVector.x + self.vy*groundVector.y; // dot product
			self.vx = groundVector.x*scalar;
			self.vy = groundVector.y*scalar;

			// GROUND'S VELOCITY ITSELF
			var currY = gy;
			var lastY = TheFunction(self.x, true);
			var groundVelY = currY - lastY;

			// Project onto normal vector, add to Sledder
			scalar = 0*normalVector.x + groundVelY*normalVector.y;
			self.vx += normalVector.x*scalar;
			self.vy += normalVector.y*scalar;

		}

		// Loop, for the hell of it!
		if(self.x<-300){
			self.x=300;
		}
		if(self.x>300){
			self.x=-300;
		}

	};

	self.draw = function(ctx){

		ctx.save();
		ctx.translate(self.x, self.y);

		// rotate how much?
		var r = Math.atan2(self.rotationVector.y, self.rotationVector.x);
		ctx.rotate(r+Math.TAU/4);

		// DRAW
		var size = 30;
		ctx.drawImage(snowmanImage, -size/2, -size-1.5, size, size);
		
		ctx.restore();

	};

}

function _turnIntoUnitVector(vector){
	var mag = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
	vector.x /= mag;
	vector.y /= mag;
}
