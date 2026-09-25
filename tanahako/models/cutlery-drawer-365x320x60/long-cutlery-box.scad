// TANAHAKO: long cutlery box
// Print four copies.
width = 89.5;
depth = 239.2;
height = 55;
wall = 2;
base = 2;

difference() {
    cube([width, depth, height]);
    translate([wall, wall, base])
        cube([width - 2 * wall, depth - 2 * wall, height - base + 0.01]);
}
