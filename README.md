# NACA 2412 Airfoil Study

Website for my research paper, *Effects of Camber, Thickness, and Angle of Attack on the Lift-to-Drag Ratio of the NACA 2412 Airfoil Used on the Cessna 172*.

**Live site:** https://phsrinivas.github.io/naca2412-airfoil-study/

## About the research

The Cessna 172 still flies on the NACA 2412, an airfoil from the 1930s. I used NASA's FoilSim to test whether changing its camber or thickness could raise the lift-to-drag ratio (L/D) across climb, cruise, and approach.

- **Round 1 (64 tests):** 4 cambers × 4 thicknesses × 4 angles of attack at 135 mph, sea level. NACA 2408, 5408, and 5412 beat the baseline's L/D of 12.06.
- **Round 2 (12 tests):** those three shapes and the baseline under climb, cruise, and approach. Only NACA 2408 won anything: cruise, at 11.85 vs. 11.32 (+4.7%). The baseline won climb and approach.

Bottom line: the changes trade one flight phase for another instead of improving the wing overall, and camber mattered more than thickness.

## What's on the site

- Summary of the paper, methods, and conclusions
- An airfoil explorer that draws any NACA 4-digit shape
- Interactive charts of both rounds of results
- A simplified Cessna 172 performance simulator (lift, drag, L/D, stall speed)

## Running it locally

It's plain HTML, CSS, and JavaScript, with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Files

```
index.html      page content
css/styles.css  styles (light and dark themes)
js/data.js      the study's results and references
js/main.js      charts, airfoil explorer, simulator
```

## Credits

Lift and drag data were generated with [NASA FoilSim](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/foilsimstudent/). Airfoil geometry uses the standard NACA 4-digit equations. Full references are listed on the site.
