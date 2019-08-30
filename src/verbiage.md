# Euler's Polyhedron Formula

*Chrome / Android is recommended for viewing this page because it uses WebGL 2.*

This page uses continuous scrollytelling to present a variation of Legendre's proof for the following formula.

**V - E + F = 2**

For any convex polyhedron (or planar graph), the number of vertices minus the number of edges plus the number of faces
is 2. Leonhard Euler discovered this in 1752 although Descartes discovered a variation over 100 years earlier.

This equation makes it easy to prove that there only 5 Platonic solids, but perhaps its real beauty lies in how it
connects disparate fields of mathematics. These connections are suggested by Legendre's proof, which is purely
geometrical and leverages some interesting properties of geodesic triangles.

Scroll down at your own pace, but try not to go too fast, otherwise you'll skip over the animation. The proof is divided
into 5 steps:

1. Surface Area of Sphere
1. Area of Double Lune
1. Girard's Theorem
1. Spherical Polygons
1. The Conclusion

<div class="chart constrain">
    <div>
        <canvas id="canvas3d"></canvas>
        <canvas id="canvas2d"></canvas>
    </div>
</div>

## Part 1: Surface Area of Sphere

The surface area of a sphere can be derived with freshman calculus, but it was discovered by Archimedes long before the
invention of calculus.

Archimedes realized that the surface area of a sphere is equal to the area of its smallest enclosing cylinder, which is
**4πr<sup>2</sup>**. This is somewhat intuitive if you think about lat-long rectangles.

At the equator, lat-long rectangles are fat and short. Closer to the poles they are tall and thin. As they move closer
to the poles, they become tall at the same rate at which they become thin, so their area remains constant.

Going forward, we'll keep things simple by focusing on a sphere whose radius is 1. The surface area of this sphere is
**4π**.

## Part 2: Area of a Double Lune

*Great circles* are lines on the surface of a sphere that divide the sphere in half. If you place your car anywhere on a
sphere's surface, then continuously drive without turning the steering wheel, you'll always inscribe a great circle. Any
portion of a great circle is called a *geodesic path*.

The region on a sphere between two great circles is called a "lune". Let's figure out the surface area of a lune bounded
by **θ** radians.

If **θ** is **π** radians, the lune encompasses one hemisphere. Since the area of a hemisphere is **2π**, the area of
the lune is **2θ**.

This is one reason why radians are more elegant than degrees!

The surface area of a lune plus its antipode is **4θ**. Let's call this a *double lune*.

## Part 3: Girard's Theorem

Spherical triangles are inscribed by geodesic lines (i.e. portions of great circles). Unlike a planar triangle, the area
of a spherical triangle can be determined solely from its angles. With planar triangles, the sum of the three angles is
always **π** radians. Not so with spherical triangles!

For example, consider the triangle that encompasses one-eighth of the sphere surface, which has three 90° angles, or
**π/2** radians each. Clearly these do not add up to **π**.

Let's figure out the area of any geodesic triangle with angles **a**, **b**, and **c**.

Each corner in the triangle corresponds to a double lune on the surface. We can visualize each double lune with one of
the additive primary colors.

The sum of the lune areas can be visualized by adding up their respective colors.
<br><br>
Notice that the total area of the lunes is equivalent to the surface of the entire sphere, except that the triangle and
its antipode are each counted an additional 2x times.

<segment>

Recall that:
- The surface area of the unit sphere is **4π**.
- The surface area of each double lune is **4θ**.

Moreover, we now know that:
- The surface area of the sphere is equal to the area of all the triangle's double lunes, minus 4x the area of the
  triangle.

Therefore, if the area of geodesic triangle **abc** is **A**, then:
- **4π = 4a + 4b + 4c - 4A**

Or, more simply stated:
- **A = a + b + c - π**

This formula was independently discovered by Albert Girard (1595-1632) and Thomas Harriot (1560-1621).

</segment>

## Part 4: Spherical Polygons

Lorem Ipsum

## Part 5: The Conclusion

Lorem Ipsum