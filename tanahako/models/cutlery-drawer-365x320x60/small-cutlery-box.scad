// TANAHAKO: small cutlery box
// Print two copies.
width = 180;
depth = 75.7;
height = 55;
wall = 2;
base = 2;

difference() {
    cube([width, depth, height]);
    translate([wall, wall, base])
        cube([width - 2 * wall, depth - 2 * wall, height - base + 0.01]);
}
