# shelly-porch-light

A small [Shelly Script](https://shelly-api-docs.shelly.cloud/gen2/Scripts/ShellyScriptLanguageFeatures) that runs a porch light on a Shelly 1 Mini Gen3. No cloud, no app automations, no external sunrise/sunset service: the device computes sun times itself.

## Behaviour

The light is on when any of these holds:

- **Evening:** from sunset until 22:00.
- **Morning:** from 07:30 until sunrise.
- **Motion:** while the input is high, and for 2 minutes after it goes low.

Sunrise and sunset are computed on the device from your latitude and longitude, so the schedule follows the seasons without any configuration changes. The evening and morning windows use the device's local time, so set the correct timezone on the Shelly.

The script configures the input as a detached switch, so motion never drives the relay directly. The script decides, which is what lets the timed hold-on work.

## Hardware

- Shelly 1 Mini Gen3 (should also work on other Gen2+ devices with one relay and one input).
- A PIR or similar motion sensor wired to the switch input.

### A note on the motion sensor

Check whether the sensor has a potential-free (dry contact) output. Many mains-powered PIR sensors do not: their switched output is meant to drive a lamp directly and only behaves when there is a real load on it. Connected to the Shelly input alone, which draws almost nothing, such a sensor may never switch off cleanly or may hold the input high through leakage.

If yours is that type, give its output a small load in parallel with the Shelly input, for example a suitably rated power resistor or the coil of a secondary relay whose contact then feeds the input. A sensor with a true potential-free contact can go straight to the input.

## Install

1. Open `porch_light.js` and set `LAT` and `LON` to your location (decimal degrees, east and north positive).
2. Optionally adjust `EVENING_END`, `MORNING_START` and `MOTION_SEC`.
3. In the Shelly web UI go to **Scripts**, create a new script, paste the file contents and save.
4. Start the script and enable **Run on startup**.

The script waits until the device has synced its clock before switching anything, so make sure the Shelly has NTP access or a correctly set time.

## How it works

`sunTimes()` is a compact implementation of the standard sunrise equation, good to a few minutes, which is plenty for a porch light. It returns `null` near the poles when the sun does not rise or set, in which case only the motion rule applies.

`evaluate()` runs every 30 seconds and on every input change. It computes whether the light should be on and only calls `Switch.Set` when that answer changes, so the relay is not hammered.

## License

[MIT](LICENSE)
