// Porch light: sunset→22:00, 07:30→sunrise, plus motion (input:0) for 2 min.
// Shelly 1 Mini Gen3

let LAT = 90.0;   // set to your location
let LON = 0.0;    // east = positive
let EVENING_END   = 22 * 60;      // 22:00 (minutes of day, local)
let MORNING_START = 7 * 60 + 30;  // 07:30
let MOTION_SEC    = 120;          // stay on this long after input goes low

let motionHigh = false;
let motionUntil = 0;
let lastWant = null;
let motionTimer = null;

// Input must not drive the relay directly
Shelly.call("Switch.SetConfig", { id: 0, config: { in_mode: "detached" } });
Shelly.call("Input.SetConfig", { id: 0, config: { type: "switch" } });

function sunTimes(unix) {
  let rad = Math.PI / 180;
  let n = Math.floor(unix / 86400) - 10957;
  let Js = n - LON / 360;
  let M = (357.5291 + 0.98560028 * Js) % 360;
  let C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  let L = (M + C + 180 + 102.9372) % 360;
  let Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  let sd = Math.sin(L * rad) * Math.sin(23.4397 * rad);
  let cd = Math.sqrt(1 - sd * sd);
  let cw = (Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * sd) / (Math.cos(LAT * rad) * cd);
  if (cw > 1 || cw < -1) return null;
  let w = Math.acos(cw) / rad / 360;
  return {
    rise: (Jt - w - 2440587.5) * 86400,
    set:  (Jt + w - 2440587.5) * 86400
  };
}

function evaluate() {
  let sys = Shelly.getComponentStatus("sys");
  if (!sys.unixtime || !sys.time) return; // no time sync yet
  let now = sys.unixtime;
  let p = sys.time.split(":");
  let localMin = Number(p[0]) * 60 + Number(p[1]);

  let sched = false;
  let s = sunTimes(now);
  if (s) {
    if (now >= s.set && localMin < EVENING_END) sched = true;
    if (localMin >= MORNING_START && now < s.rise) sched = true;
  }
  let want = sched || motionHigh || now < motionUntil;

  if (want !== lastWant) {
    lastWant = want;
    Shelly.call("Switch.Set", { id: 0, on: want });
  }
}

Shelly.addStatusHandler(function (e) {
  if (e.component !== "input:0" || !e.delta || typeof e.delta.state === "undefined") return;
  motionHigh = e.delta.state;
  if (!motionHigh) {
    motionUntil = Shelly.getComponentStatus("sys").unixtime + MOTION_SEC;
    if (motionTimer !== null) Timer.clear(motionTimer);
    motionTimer = Timer.set((MOTION_SEC + 1) * 1000, false, function () {
      motionTimer = null;
      evaluate();
    });
  }
  evaluate();
});

let inp = Shelly.getComponentStatus("input:0");
motionHigh = inp && inp.state === true;

Timer.set(30000, true, evaluate);
evaluate();
