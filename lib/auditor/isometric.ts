export const UNIT = 28;
const COS_30 = Math.sqrt(3) / 2;
const TEXT_SCALE = 0.36;

export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };

export function iso(x: number, y: number, z: number): Point2D {
  return {
    x: (x - y) * COS_30 * UNIT,
    y: (x + y) * 0.5 * UNIT - z * UNIT,
  };
}

function points(vertices: Point3D[]): string {
  return vertices
    .map(({ x, y, z }) => {
      const point = iso(x, y, z);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function boxFaces(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
) {
  return {
    top: points([
      { x, y, z: z + h },
      { x: x + w, y, z: z + h },
      { x: x + w, y: y + d, z: z + h },
      { x, y: y + d, z: z + h },
    ]),
    left: points([
      { x, y, z },
      { x, y: y + d, z },
      { x, y: y + d, z: z + h },
      { x, y, z: z + h },
    ]),
    right: points([
      { x: x + w, y, z },
      { x: x + w, y: y + d, z },
      { x: x + w, y: y + d, z: z + h },
      { x: x + w, y, z: z + h },
    ]),
  };
}

function planeMatrix(x: number, y: number, z: number, alongY = false, scale = TEXT_SCALE): string {
  const origin = iso(x, y, z);
  const a = COS_30;
  const b = alongY ? -0.5 : 0.5;
  const c = alongY ? COS_30 : -COS_30;
  const d = 0.5;
  const values = [a, b, c, d].map((value) => (value * scale).toFixed(4));
  return `matrix(${values.join(" ")} ${origin.x.toFixed(2)} ${origin.y.toFixed(2)})`;
}

export function groundMatrix(x: number, y: number, alongY = false, scale = TEXT_SCALE): string {
  return planeMatrix(x, y, 0, alongY, scale);
}

export function topMatrix(x: number, y: number, z: number, alongY = false, scale = TEXT_SCALE): string {
  return planeMatrix(x, y, z, alongY, scale);
}
