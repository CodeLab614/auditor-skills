"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { boxFaces, groundMatrix, iso, topMatrix, UNIT, type Point3D } from "@/lib/auditor/isometric";

const steps = [
  {
    id: "enviar",
    name: "Enviar",
    detail: "Pegas la ruta de GitHub de una skill pública. Se aparta uno de tus análisis del mes.",
  },
  {
    id: "huella",
    name: "Huella",
    detail:
      "Se calcula una huella de todos sus archivos. Si esa misma versión ya se analizó, " +
      "ves el reporte al momento.",
  },
  {
    id: "analisis",
    name: "Análisis",
    detail:
      "Se lee cada archivo sin ejecutarlo: reglas conocidas y una IA que explica cada línea " +
      "y compara lo que la skill dice con lo que hace.",
  },
  {
    id: "caja",
    name: "Caja aislada",
    detail:
      "Los scripts se ejecutan en una máquina desechable, sin permisos y vigilada, para ver " +
      "qué archivos tocan y a dónde se conectan.",
  },
  {
    id: "veredicto",
    name: "Veredicto",
    detail: "Un veredicto claro, con cada aviso, su porqué y lo que no se pudo comprobar.",
  },
];

const desktopStations: Point3D[] = [
  { x: 0, y: 4.2, z: 0 },
  { x: 5.5, y: 4.2, z: 0 },
  { x: 5.5, y: 0, z: 0 },
  { x: 11, y: 0, z: 0 },
  { x: 11, y: -4.2, z: 0 },
];

const mobileStations: Point3D[] = [
  { x: 0, y: 0, z: 0 },
  { x: 4.4, y: 0, z: 0 },
  { x: 4.4, y: 3.2, z: 0 },
  { x: 9.4, y: 3.2, z: 0 },
  { x: 9.4, y: 7, z: 0 },
];

const STATION_WIDTH = 3.2;
const STATION_DEPTH = 2;
const STATION_HEIGHT = 0.35;
const GLASS_MARGIN = 0.6;
const GLASS_HEIGHT = 2;
const TEXT_SCALE = 0.36;
const ZONE_LABEL_SCALE = 0.27;
let pluginsRegistered = false;

function subscribeToMotionPreference(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function projectedPath(points: Point3D[]): string {
  return points
    .map((point, index) => {
      const projected = iso(point.x, point.y, point.z);
      return `${index === 0 ? "M" : "L"}${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    })
    .join(" ");
}

function getZoneLabels(mobile: boolean) {
  if (mobile) return [];
  return [
    { text: "Repositorio público", x: 0, y: 6.8, alongY: false },
    { text: "Sin ejecutar nada", x: 9.3, y: 6.2, alongY: true },
    { text: "Máquina desechable", x: 10.4, y: 3.2, alongY: false },
    { text: "Reporte por versión", x: 14.8, y: -1.8, alongY: true },
  ];
}

function stationCenter({ x, y }: Point3D): Point3D {
  return { x: x + STATION_WIDTH / 2, y: y + STATION_DEPTH / 2, z: 0 };
}

function verdictCardAnchor(position: Point3D): Point3D {
  return {
    x: position.x + STATION_WIDTH / 2,
    y: position.y + 0.3,
    z: position.z + STATION_HEIGHT,
  };
}

function stationExit(position: Point3D, index: number, mobile: boolean): Point3D {
  if (index === 4) return verdictCardAnchor(position);
  if (index % 2 === 0 && index !== 4) {
    return { x: position.x + STATION_WIDTH, y: position.y + STATION_DEPTH / 2, z: 0 };
  }
  return {
    x: position.x + STATION_WIDTH / 2,
    y: position.y + (mobile ? STATION_DEPTH : 0),
    z: 0,
  };
}

function routedPoints(stations: Point3D[], mobile: boolean): Point3D[] {
  const centers = stations.map(stationCenter);
  const turns = mobile
    ? [
        { x: 6, y: 1, z: 0 },
        { x: 6, y: 4.2, z: 0 },
        { x: 11, y: 4.2, z: 0 },
        { x: 11, y: 5.8, z: 0 },
      ]
    : [
        { x: 7.1, y: 5.2, z: 0 },
        { x: 7.1, y: 1, z: 0 },
        { x: 12.6, y: 1, z: 0 },
        { x: 12.6, y: -0.6, z: 0 },
      ];
  return [
    stationExit(stations[0], 0, mobile),
    turns[0],
    centers[1],
    stationExit(stations[1], 1, mobile),
    turns[1],
    centers[2],
    stationExit(stations[2], 2, mobile),
    turns[2],
    centers[3],
    stationExit(stations[3], 3, mobile),
    turns[3],
    stationExit(stations[4], 4, mobile),
  ];
}

function packageStops(mobile: boolean): Point3D[] {
  return mobile
    ? [
        { x: 3.8, y: 1, z: 0 },
        { x: 6, y: 2.6, z: 0 },
        { x: 7.9, y: 4.2, z: 0 },
        { x: 11, y: 6.4, z: 0 },
      ]
    : [
        { x: 4.35, y: 5.2, z: 0 },
        { x: 7.1, y: 3.9, z: 0 },
        { x: 9.55, y: 1, z: 0 },
        { x: 12.6, y: -1.4, z: 0 },
      ];
}

function routeRatioAtPoint(points: Point3D[], target: Point3D): number {
  const projectedPoints = points.map(({ x, y, z }) => iso(x, y, z));
  const projectedTarget = iso(target.x, target.y, target.z);
  const lengths = projectedPoints.slice(1).map((point, index) => {
    const previous = projectedPoints[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let traveled = 0;
  let closest = { distance: Number.POSITIVE_INFINITY, along: 0 };

  lengths.forEach((length, index) => {
    const start = projectedPoints[index];
    const end = projectedPoints[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const progress = length
      ? Math.max(
          0,
          Math.min(1, ((projectedTarget.x - start.x) * dx + (projectedTarget.y - start.y) * dy) / length ** 2),
        )
      : 0;
    const projectedX = start.x + dx * progress;
    const projectedY = start.y + dy * progress;
    const distance = Math.hypot(projectedTarget.x - projectedX, projectedTarget.y - projectedY);

    if (distance < closest.distance) closest = { distance, along: traveled + length * progress };
    traveled += length;
  });

  return total ? closest.along / total : 0;
}

function groundBounds(stations: Point3D[]) {
  return {
    minX: Math.min(...stations.map(({ x }) => x)) - 1.5,
    maxX: Math.max(...stations.map(({ x }) => x + STATION_WIDTH)) + 1.5,
    minY: Math.min(...stations.map(({ y }) => y)) - 1.5,
    maxY: Math.max(...stations.map(({ y }) => y + STATION_DEPTH)) + 1.5,
  };
}

const packageCardWidth = (0.9 * 28 * Math.sqrt(3)) / 2;
const packageCardHeight = 1.2 * 28;

function packagePosition(point: { x: number; y: number }) {
  return {
    x: point.x - packageCardWidth / 2,
    y: point.y,
  };
}

function placePackage(packageEl: SVGGElement, point: { x: number; y: number }) {
  const position = packagePosition(point);
  packageEl.setAttribute("transform", `translate(${position.x} ${position.y})`);
}

function warnOnVerdictCardPosition(scene: SVGSVGElement) {
  if (getComputedStyle(scene).display === "none") return;
  const mobile = scene.classList.contains("auditor-pipeline__svg--mobile");
  const stations = mobile ? mobileStations : desktopStations;
  const panel = scene.querySelector<SVGGElement>("[data-verdict-panel]");
  const station = panel?.closest<SVGGElement>("[data-station]");
  const stationMatrix = station?.getScreenCTM();
  const panelMatrix = panel?.getScreenCTM();
  if (!stationMatrix || !panelMatrix) return;

  const anchor = verdictCardAnchor(stations[4]);
  const projected = iso(anchor.x, anchor.y, anchor.z);
  const expected = new DOMPoint(projected.x, projected.y).matrixTransform(stationMatrix);
  const actual = new DOMPoint(
    (1.4 * UNIT * Math.sqrt(3)) / 4,
    1.4 * 0.5 * 0.5 * UNIT,
  ).matrixTransform(panelMatrix);
  const difference = Math.hypot(expected.x - actual.x, expected.y - actual.y);
  if (difference > 1) {
    console.warn(
      `La base de la tarjeta de Veredicto (${mobile ? "móvil" : "escritorio"}) difiere ` +
        `${difference.toFixed(2)} px del anclaje isométrico.`,
    );
  }
}

function projectedGridLine(axis: "x" | "y", value: number, bounds: ReturnType<typeof groundBounds>): string {
  const start = axis === "x" ? { x: value, y: bounds.minY, z: 0 } : { x: bounds.minX, y: value, z: 0 };
  const end = axis === "x" ? { x: value, y: bounds.maxY, z: 0 } : { x: bounds.maxX, y: value, z: 0 };
  const a = iso(start.x, start.y, start.z);
  const b = iso(end.x, end.y, end.z);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function warnOnProjectedCollisions(scene: SVGSVGElement) {
  if (getComputedStyle(scene).display === "none") return;
  const project = (point: DOMPoint, element: SVGGraphicsElement) => {
    const matrix = element.getScreenCTM();
    return matrix ? point.matrixTransform(matrix) : point;
  };
  const overlaps = (first: DOMPoint[], second: DOMPoint[]) => {
    const polygons = [first, second];
    return polygons.every((polygon) =>
      polygon.every((point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        const axis = { x: next.y - point.y, y: point.x - next.x };
        const projectAxis = (vertices: DOMPoint[]) => vertices.map((vertex) => vertex.x * axis.x + vertex.y * axis.y);
        const firstRange = projectAxis(first);
        const secondRange = projectAxis(second);
        return (
          Math.max(...firstRange) >= Math.min(...secondRange) && Math.max(...secondRange) >= Math.min(...firstRange)
        );
      }),
    );
  };
  const packageEl = scene.querySelector<SVGGElement>("[data-package]");
  const packageFace = scene.querySelector<SVGGraphicsElement>(".auditor-pipeline__package-face");
  if (!packageEl || !packageFace) return;
  const mobile = scene.classList.contains("auditor-pipeline__svg--mobile");
  const labelNodes = Array.from(
    scene.querySelectorAll<SVGTextElement>(
      ".auditor-pipeline__station-number, .auditor-pipeline__station-label, " +
        ".auditor-pipeline__detail text, .auditor-pipeline__code-lines text, " +
        ".auditor-pipeline__verdict-panel text",
    ),
  );
  const stops = packageStops(mobile);
  const originalTransform = packageEl.getAttribute("transform");
  const packagePolygon = () => {
    const bounds = packageFace.getBBox();
    return [
      new DOMPoint(bounds.x, bounds.y),
      new DOMPoint(bounds.x + bounds.width, bounds.y),
      new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height),
      new DOMPoint(bounds.x, bounds.y + bounds.height),
    ].map((vertex) => project(vertex, packageFace));
  };
  stops.forEach((stop, index) => {
    const point = iso(stop.x, stop.y, stop.z);
    placePackage(packageEl, point);
    const cardPolygon = packagePolygon();
    const collisions = labelNodes.filter((label) => {
      const box = label.getBBox();
      const textPolygon = [
        new DOMPoint(box.x, box.y),
        new DOMPoint(box.x + box.width, box.y),
        new DOMPoint(box.x + box.width, box.y + box.height),
        new DOMPoint(box.x, box.y + box.height),
      ].map((vertex) => project(vertex, label));
      return overlaps(cardPolygon, textPolygon);
    });
    if (collisions.length) {
      const stations = [
        ...new Set(collisions.map((label) => label.closest<SVGGElement>("[data-station]")?.dataset.station)),
      ]
        .filter(Boolean)
        .join(", ");
      console.warn(
        `La ficha parada ${steps[index].name} se cruza con texto de la estación: ${stations || "sin identificar"}.`,
      );
    }
  });
  if (originalTransform) packageEl.setAttribute("transform", originalTransform);
  else packageEl.removeAttribute("transform");
}

function sceneViewBox(stations: Point3D[], mobile: boolean): string {
  const points = stations.flatMap(({ x, y, z }) =>
    [x, x + STATION_WIDTH].flatMap((cornerX) =>
      [y, y + STATION_DEPTH].flatMap((cornerY) => [
        iso(cornerX, cornerY, z),
        iso(cornerX, cornerY, z + STATION_HEIGHT),
      ]),
    ),
  );
  const glass = stations[3];
  const glassX = glass.x - GLASS_MARGIN;
  const glassY = glass.y - GLASS_MARGIN;
  [glassX, glassX + STATION_WIDTH + GLASS_MARGIN * 2].forEach((x) => {
    [glassY, glassY + STATION_DEPTH + GLASS_MARGIN * 2].forEach((y) => {
      points.push(iso(x, y, 0), iso(x, y, GLASS_HEIGHT));
    });
  });

  const card = stations[4];
  const cardX = card.x + (STATION_WIDTH - 1.8) / 2;
  const cardY = card.y + 0.3;
  points.push(
    iso(cardX, cardY, STATION_HEIGHT),
    iso(cardX + 1.8, cardY, STATION_HEIGHT),
    iso(cardX, cardY, STATION_HEIGHT + 2.2),
    iso(cardX + 1.8, cardY, STATION_HEIGHT + 2.2),
  );

  getZoneLabels(mobile).forEach(({ text, x, y, alongY }) => {
    const origin = iso(x, y, 0);
    const length = text.length * 33 * 0.6 * ZONE_LABEL_SCALE;
    points.push(origin, {
      x: origin.x + (length * Math.sqrt(3)) / 2,
      y: origin.y + length * (alongY ? -0.5 : 0.5),
    });
  });

  const minX = Math.min(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxX = Math.max(...points.map(({ x }) => x));
  const maxY = Math.max(...points.map(({ y }) => y));
  const margin = 0.8 * 28;
  return (
    `${(minX - margin).toFixed(1)} ${(minY - margin).toFixed(1)} ` +
    `${(maxX - minX + margin * 2).toFixed(1)} ${(maxY - minY + margin * 2).toFixed(1)}`
  );
}

function StageDetails({ id, x, y, z, mobile }: Point3D & { id: string; mobile: boolean }) {
  const detailStart = topMatrix(x + 0.3, y + (mobile ? 1.5 : 1.4), z + STATION_HEIGHT + 0.012, false, TEXT_SCALE);

  if (id === "enviar") {
    return (
      <g
        className="auditor-pipeline__detail-wrap"
        transform={topMatrix(x + 0.3, y + 1.6, z + STATION_HEIGHT + 0.012, false, TEXT_SCALE)}
      >
        <g className="auditor-pipeline__detail">
          <rect x="-5" y="-15" width={mobile ? 230 : 276} height="30" rx="15" />
          <text x="0" y="4">
            {mobile ? "github.com/…" : "github.com/…/skill"}
          </text>
        </g>
      </g>
    );
  }

  if (id === "huella") {
    return (
      <g className="auditor-pipeline__detail-wrap" transform={detailStart}>
        <text className="auditor-pipeline__detail auditor-pipeline__hash" data-scramble x="0" y="21">
          a3f9·c01e
        </text>
      </g>
    );
  }

  if (id === "analisis") {
    return (
      <g className="auditor-pipeline__detail-wrap" transform={detailStart}>
        <g className="auditor-pipeline__code-lines">
          {[88, 112, 69, 101].map((width, index) => (
            <path
              key={width + index}
              data-code-line
              d={`M0 ${index * 10}h${width}`}
              className={index === 1 ? "is-accent" : ""}
            />
          ))}
          <path className="auditor-pipeline__scan" d="M-4 0v31" />
        </g>
      </g>
    );
  }

  if (id === "veredicto") {
    return null;
  }

  return null;
}

function GlassRear({ position }: { position: Point3D }) {
  const x = position.x - GLASS_MARGIN;
  const y = position.y - GLASS_MARGIN;
  const width = STATION_WIDTH + GLASS_MARGIN * 2;
  const depth = STATION_DEPTH + GLASS_MARGIN * 2;
  const entryY = position.y + STATION_DEPTH / 2;
  const exitX = position.x + STATION_WIDTH / 2;
  const walls = [
    [
      [x, y, 0],
      [x, entryY - 0.4, 0],
      [x, entryY - 0.4, GLASS_HEIGHT],
      [x, y, GLASS_HEIGHT],
    ],
    [
      [x, entryY + 0.4, 0],
      [x, y + depth, 0],
      [x, y + depth, GLASS_HEIGHT],
      [x, entryY + 0.4, GLASS_HEIGHT],
    ],
    [
      [x + width, y, 0],
      [x + width, y + depth, 0],
      [x + width, y + depth, GLASS_HEIGHT],
      [x + width, y, GLASS_HEIGHT],
    ],
    [
      [x, y, 0],
      [exitX - 0.4, y, 0],
      [exitX - 0.4, y, GLASS_HEIGHT],
      [x, y, GLASS_HEIGHT],
    ],
    [
      [exitX + 0.4, y, 0],
      [x + width, y, 0],
      [x + width, y, GLASS_HEIGHT],
      [exitX + 0.4, y, GLASS_HEIGHT],
    ],
    [
      [x, y + depth, 0],
      [x + width, y + depth, 0],
      [x + width, y + depth, GLASS_HEIGHT],
      [x, y + depth, GLASS_HEIGHT],
    ],
  ];
  const polygon = (vertices: number[][]) =>
    vertices
      .map(([wallX, wallY, z]) => {
        const point = iso(wallX, wallY, z);
        return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      })
      .join(" ");
  return (
    <g data-glass-back className="auditor-pipeline__glass">
      {walls.map((vertices) => (
        <polygon key={polygon(vertices)} points={polygon(vertices)} />
      ))}
    </g>
  );
}

function GlassFront({ position }: { position: Point3D }) {
  const x = position.x - GLASS_MARGIN;
  const y = position.y - GLASS_MARGIN;
  const width = STATION_WIDTH + GLASS_MARGIN * 2;
  const depth = STATION_DEPTH + GLASS_MARGIN * 2;
  const height = GLASS_HEIGHT;
  const entryY = position.y + STATION_DEPTH / 2;
  const exitX = position.x + STATION_WIDTH / 2;
  const segments = [
    [
      [x, y],
      [exitX - 0.4, y],
    ],
    [
      [exitX + 0.4, y],
      [x + width, y],
    ],
    [
      [x, y],
      [x, entryY - 0.4],
    ],
    [
      [x, entryY + 0.4],
      [x, y + depth],
    ],
  ];
  const floorPaths = segments.map(([[x1, y1], [x2, y2]]) => {
    const start = iso(x1, y1, 0);
    const end = iso(x2, y2, 0);
    return `M${start.x} ${start.y}L${end.x} ${end.y}`;
  });
  const postPaths = [
    [x, y + depth],
    [x + width, y],
  ].map(([edgeX, edgeY]) => {
    const low = iso(edgeX, edgeY, 0.8);
    const high = iso(edgeX, edgeY, 1.5);
    const top = iso(edgeX, edgeY, height);
    const bottom = iso(edgeX, edgeY, 0);
    return `M${top.x} ${top.y}L${high.x} ${high.y}M${low.x} ${low.y}L${bottom.x} ${bottom.y}`;
  });
  return (
    <g>
      {[...floorPaths, ...postPaths].map((path) => (
        <path key={path} data-glass-front className="auditor-pipeline__glass" d={path} />
      ))}
    </g>
  );
}

function Station({
  step,
  index,
  position,
  active,
  mobile,
  onActivate,
  onRelease,
  onToggle,
}: {
  step: (typeof steps)[number];
  index: number;
  position: Point3D;
  active: boolean;
  mobile: boolean;
  onActivate: () => void;
  onRelease: () => void;
  onToggle: () => void;
}) {
  const x = position.x;
  const y = position.y;
  const stageZ = position.z;
  const faces = boxFaces(x, y, stageZ, STATION_WIDTH, STATION_DEPTH, STATION_HEIGHT);
  const cardWidth = 1.4;
  const cardHeight = 1.8;
  const cardWidthPx = (cardWidth * UNIT * Math.sqrt(3)) / 2;
  const cardHeightPx = cardHeight * UNIT;
  const cardBaseOffsetY = cardWidth * 0.5 * 0.5 * UNIT;
  const cardBaseY = cardBaseOffsetY * 2;
  const cardPath = `M0 0L${cardWidthPx} ${cardBaseY}V${cardBaseY - cardHeightPx}` +
    `L0 ${-cardHeightPx}Z`;
  const verdictPosition = verdictCardAnchor(position);
  const verdictAnchor = iso(verdictPosition.x, verdictPosition.y, verdictPosition.z);
  const keyAction = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    } else if (event.key === "Escape") {
      onRelease();
    }
  };

  return (
    <g
      data-station={step.id}
      className={`auditor-pipeline__station auditor-pipeline__layer-block ${active ? "is-active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${step.name}. ${step.detail}`}
      aria-pressed={active}
      onMouseEnter={onActivate}
      onMouseLeave={onRelease}
      onFocus={onActivate}
      onBlur={onRelease}
      onClick={onToggle}
      onKeyDown={keyAction}
    >
      <polygon points={faces.left} className="auditor-pipeline__face auditor-pipeline__face--left" />
      <polygon points={faces.right} className="auditor-pipeline__face auditor-pipeline__face--right" />
      <polygon points={faces.top} className="auditor-pipeline__face auditor-pipeline__face--top" />
      {step.id === "veredicto" && (
        <g
          data-verdict-panel-lift
        >
          <g
            data-verdict-panel
            className="auditor-pipeline__verdict-panel"
            transform={`translate(${verdictAnchor.x - cardWidthPx / 2} ${verdictAnchor.y - cardBaseOffsetY})`}
          >
            <path d={cardPath} />
            <circle data-verdict-dot cx={cardWidthPx - 6} cy={-cardHeightPx + 8} r="3.5" />
            {[0, 1, 2].map((line) => (
              <path
                key={line}
                d={`M5 ${-cardHeightPx + 15 + line * 7}h${cardWidthPx - 14 - line * 5}`}
              />
            ))}
          </g>
        </g>
      )}
      <StageDetails id={step.id} x={x} y={y} z={stageZ} mobile={mobile} />
      <g
        className="auditor-pipeline__station-label-wrap"
        transform={topMatrix(x + 0.3, y + 0.55, stageZ + STATION_HEIGHT + 0.012, false, TEXT_SCALE)}
      >
        <text className="auditor-pipeline__station-number">{String(index + 1).padStart(2, "0")}</text>
      </g>
      <g
        className="auditor-pipeline__station-label-wrap"
        transform={topMatrix(x + 0.3, y + 1.15, stageZ + STATION_HEIGHT + 0.012, false, TEXT_SCALE)}
      >
        <text className="auditor-pipeline__station-label">{step.name}</text>
      </g>
    </g>
  );
}

function Scene({
  mobile,
  reducedMotion,
  active,
  onActivate,
  onRelease,
  onToggle,
}: {
  mobile: boolean;
  reducedMotion: boolean;
  active: string | null;
  onActivate: (id: string) => void;
  onRelease: () => void;
  onToggle: (id: string) => void;
}) {
  const stations = mobile ? mobileStations : desktopStations;
  const bounds = groundBounds(stations);
  const groundLines = [
    ...Array.from({ length: bounds.maxX - bounds.minX + 1 }, (_, index) =>
      projectedGridLine("x", bounds.minX + index, bounds),
    ),
    ...Array.from({ length: bounds.maxY - bounds.minY + 1 }, (_, index) =>
      projectedGridLine("y", bounds.minY + index, bounds),
    ),
  ];
  const route = routedPoints(stations, mobile);
  const packageStartPoint = packageStops(mobile)[0];
  const packageStart = iso(packageStartPoint.x, packageStartPoint.y, 0);
  const packageOrigin = packagePosition(packageStart);
  const cardWidthPx = packageCardWidth;
  const cardHeightPx = packageCardHeight;
  const cardPath =
    `M0 0H${cardWidthPx}V${-cardHeightPx + 8}L${cardWidthPx - 8} ${-cardHeightPx}` + `H0Z`;
  const zoneLabels = getZoneLabels(mobile);
  const maskId = mobile ? "auditor-iso-mobile-fade" : "auditor-iso-desktop-fade";

  return (
    <svg
      className={`auditor-pipeline__svg ${mobile ? "auditor-pipeline__svg--mobile" : "auditor-pipeline__svg--desktop"}`}
      viewBox={sceneViewBox(stations, mobile)}
      overflow="hidden"
      role="group"
      aria-label="Cinco pasos: enviar, huella, análisis, caja aislada y veredicto"
    >
      <title>Cómo se audita una skill</title>
      <desc>
        Una plataforma isométrica muestra las cinco etapas desde el repositorio público hasta el reporte por versión,
        incluida la ejecución en una máquina aislada.
      </desc>
      <defs>
        <radialGradient id={maskId}>
          <stop offset="0%" stopColor="white" />
          <stop offset="72%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id={`${maskId}-mask`}>
          <rect x="-600" y="-500" width="1300" height="1500" fill={`url(#${maskId})`} />
        </mask>
      </defs>
      <GlassRear position={stations[3]} />
      <g data-ground className="auditor-pipeline__layer-ground" mask={`url(#${maskId}-mask)`}>
        {groundLines.map((path) => (
          <path key={path} data-grid-line d={path} className="auditor-pipeline__grid-line" />
        ))}
      </g>
      <g data-route-layer className="auditor-pipeline__layer-route">
        <path data-route className="auditor-pipeline__route-band" d={projectedPath(route)} />
        <path className="auditor-pipeline__route-pulse" d={projectedPath(route)} />
      </g>
      <g data-stations-layer className="auditor-pipeline__layer-stations">
        {stations
          .map((position, index) => ({ position, index }))
          .sort((first, second) => {
            const firstCenter = stationCenter(first.position);
            const secondCenter = stationCenter(second.position);
            return firstCenter.x + firstCenter.y - secondCenter.x - secondCenter.y;
          })
          .map(({ position, index }) => {
            const step = steps[index];
            return (
              <Station
                key={step.id}
                step={step}
                index={index}
                position={position}
                active={active === step.id}
                mobile={mobile}
                onActivate={() => onActivate(step.id)}
                onRelease={onRelease}
                onToggle={() => onToggle(step.id)}
              />
            );
          })}
      </g>
      <g data-package-parallax>
        <g
          data-package
          className="auditor-pipeline__package"
          data-stage={reducedMotion ? "veredicto" : "enviar"}
          transform={`translate(${packageOrigin.x} ${packageOrigin.y})`}
        >
          <path className="auditor-pipeline__package-face" d={cardPath} />
          <path
            className="auditor-pipeline__package-fold"
            d={`M${cardWidthPx - 8} ${-cardHeightPx}V${-cardHeightPx + 8}H${cardWidthPx}`}
          />
          <path
            className="auditor-pipeline__package-lines"
            d={
              `M5 ${-cardHeightPx + 12}h${cardWidthPx - 14}` +
              `M5 ${-cardHeightPx + 19}h${cardWidthPx - 19}` +
              `M5 ${-cardHeightPx + 26}h${cardWidthPx - 24}`
            }
          />
        </g>
      </g>
      <GlassFront position={stations[3]} />
      <g className="auditor-pipeline__zone-labels">
        {zoneLabels.map((label) => (
          <g key={label.text} transform={groundMatrix(label.x, label.y, label.alongY, ZONE_LABEL_SCALE)}>
            <text data-zone-label className="auditor-pipeline__zone-label">
              {label.text}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function PipelineIllustration() {
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => false);
  const [loopStep, setLoopStep] = useState(0);
  const [sealStep, setSealStep] = useState(-1);
  const [verdictIndex, setVerdictIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const hashSeal = useRef<HTMLSpanElement>(null);
  const loopRef = useRef<gsap.core.Timeline | null>(null);
  const interactionRef = useRef(false);
  const pinnedRef = useRef(false);
  const selected = steps.find((step) => step.id === active);
  const selectedIndex = selected ? steps.findIndex((step) => step.id === selected.id) : null;
  const activeRef = useRef<string | null>(null);
  const onStepChange = useCallback((index: number) => {
    setLoopStep(index);
    setSealStep(index);
    if (index === 1) {
      requestAnimationFrame(() => {
        if (hashSeal.current) {
          gsap.to(hashSeal.current, {
            duration: 0.55,
            scrambleText: { text: "9d2b", chars: "0123456789abcdef" },
          });
        }
      });
    }
  }, []);
  const shownStep = reducedMotion ? steps.length - 1 : loopStep;
  const shownSealStep = selectedIndex ?? (reducedMotion ? steps.length - 1 : sealStep);
  const verdicts = ["Peligrosa", "Revisar", "Sin hallazgos graves"];

  const resumeLoop = useCallback(() => {
    requestAnimationFrame(() => {
      if (activeRef.current || pinnedRef.current || !root.current || reducedMotion) return;
      interactionRef.current = false;
      if (document.visibilityState === "visible" && ScrollTrigger.isInViewport(root.current)) {
        loopRef.current?.play();
      }
    });
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const checkVerdictPositions = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        gsap.utils
          .toArray<SVGSVGElement>(".auditor-pipeline__svg", element)
          .forEach(warnOnVerdictCardPosition);
      });
    };
    if (process.env.NODE_ENV !== "production") {
      gsap.utils.toArray<SVGSVGElement>(".auditor-pipeline__svg", element).forEach(warnOnProjectedCollisions);
      window.addEventListener("resize", checkVerdictPositions);
      checkVerdictPositions();
    }
    if (!pluginsRegistered) {
      gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, ScrambleTextPlugin);
      pluginsRegistered = true;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", checkVerdictPositions);
      };
    }

    const ctx = gsap.context(() => {
      let introComplete = false;
      const scenes = gsap.utils
        .toArray<SVGSVGElement>(".auditor-pipeline__svg", element)
        .filter((scene) => getComputedStyle(scene).display !== "none");
      const paths = scenes.map((scene) => scene.querySelector<SVGPathElement>("[data-route]"));
      const packageEls = scenes.map((scene) => scene.querySelector<SVGGElement>("[data-package]"));
      const loop = gsap.timeline({
        paused: true,
        repeat: -1,
        repeatDelay: 0.25,
        onRepeat: () => {
          packageEls.forEach((packageEl) => {
            if (!packageEl) return;
            packageEl.dataset.stage = "enviar";
            packageEl.style.opacity = "1";
            const scene = packageEl.closest<SVGSVGElement>("svg");
            if (!scene) return;
            const mobile = scene.classList.contains("auditor-pipeline__svg--mobile");
            const firstStop = packageStops(mobile)[0];
            const point = iso(firstStop.x, firstStop.y, firstStop.z);
            placePackage(packageEl, point);
          });
          setLoopStep(0);
          setSealStep(-1);
        },
      });
      loopRef.current = loop;

      scenes.forEach((scene, sceneIndex) => {
        const routePath = paths[sceneIndex];
        const packageEl = packageEls[sceneIndex];
        if (!routePath || !packageEl) return;
        const mobile = scene.classList.contains("auditor-pipeline__svg--mobile");
        const stations = mobile ? mobileStations : desktopStations;
        const routeLength = routePath.getTotalLength();
        const routePoints = routedPoints(stations, mobile);
        const stops = [
          ...packageStops(mobile),
          verdictCardAnchor(stations[4]),
        ].map((stop) => routeRatioAtPoint(routePoints, stop));
        const sceneStations = gsap.utils
          .toArray<SVGGElement>("[data-station]", scene)
          .sort(
            (first, second) =>
              steps.findIndex(({ id }) => id === first.dataset.station) -
              steps.findIndex(({ id }) => id === second.dataset.station),
          );
        const visitStation = (station: SVGGElement, id: string) => {
          const index = steps.findIndex((step) => step.id === id);
          packageEl.dataset.stage = id;
          onStepChange(index);
          const stationTop = station.querySelector(".auditor-pipeline__face--top");
          if (stationTop) {
            gsap.fromTo(
              stationTop,
              { fill: "var(--auditor-bg)" },
              {
                fill: "var(--auditor-highlight)",
                duration: 0.14,
                yoyo: true,
                repeat: 1,
              },
            );
          }
          if (id === "enviar") {
            gsap.fromTo(
              station.querySelector(".auditor-pipeline__detail"),
              { opacity: 0.3 },
              {
                opacity: 1,
                duration: 0.18,
                repeat: 1,
                yoyo: true,
              },
            );
          } else if (id === "huella") {
            const hash = station.querySelector<SVGTextElement>("[data-scramble]");
            if (hash) {
              const variants = ["9d2b·4f71", "b7e1·a823", "2c0f·91da"];
              const hashIndex = Number(station.dataset.hashIndex ?? "-1") + 1;
              station.dataset.hashIndex = String(hashIndex % variants.length);
              gsap.to(hash, {
                duration: 0.75,
                scrambleText: {
                  text: variants[hashIndex % variants.length],
                  chars: "0123456789abcdef",
                },
              });
            }
          } else if (id === "analisis") {
            const lines = gsap.utils.toArray<SVGPathElement>("[data-code-line]", station);
            gsap
              .timeline()
              .fromTo(
                station.querySelector(".auditor-pipeline__scan"),
                { x: 0 },
                {
                  x: 92,
                  duration: 0.8,
                },
              )
              .fromTo(lines, { opacity: 0.35 }, { opacity: 1, stagger: 0.1, duration: 0.12 }, 0);
          } else if (id === "caja") {
            gsap.fromTo(
              scene.querySelector("[data-glass-front]"),
              { strokeDashoffset: 28 },
              {
                strokeDashoffset: 0,
                duration: 0.9,
              },
            );
          } else if (id === "veredicto") {
            const dot = station.querySelector("[data-verdict-dot]");
            const panel = station.querySelector("[data-verdict-panel-lift]");
            const colors = ["#b44b3d", "#c17e2e", "#488567"];
            const colorIndex = Number(station.dataset.verdictIndex ?? "-1") + 1;
            station.dataset.verdictIndex = String(colorIndex % colors.length);
            setVerdictIndex(colorIndex % colors.length);
            packageEl.style.setProperty("--verdict-color", colors[colorIndex % colors.length]);
            gsap.to(panel, { y: -6, duration: 0.22, yoyo: true, repeat: 1 });
            gsap.to(dot, { fill: colors[colorIndex % colors.length], duration: 0.2 });
            gsap.to(packageEl, { opacity: 0, duration: 0.28 });
          }
        };

        loop.to({}, { duration: 0.45 });
        for (let index = 0; index < sceneStations.length; index += 1) {
          const progress = { value: 0 };
          const startRatio = index === 0 ? stops[0] : stops[index - 1];
          loop.fromTo(
            progress,
            { value: 0 },
            {
              value: 1,
              duration: index === 4 ? 1.2 : 1.6,
              ease: "none",
              onUpdate: () => {
                const ratio = startRatio + (stops[index] - startRatio) * progress.value;
                const point = routePath.getPointAtLength(routeLength * ratio);
                placePackage(packageEl, point);
              },
            },
          );
          const station = sceneStations[index];
          const stationId = station.dataset.station ?? "";
          loop.call(() => visitStation(station, stationId));
          loop.to({}, { duration: 0.45 });
        }
        const pulse = scene.querySelector(".auditor-pipeline__route-pulse");
        const routeBand = scene.querySelector(".auditor-pipeline__route-band");
        if (routeBand) {
          loop.set(routeBand, { strokeOpacity: 0.45 }, 0);
        }
        if (pulse) {
          loop.fromTo(pulse, { strokeDashoffset: 0 }, { strokeDashoffset: -96, duration: 8.65, ease: "none" }, 0);
        }
      });

      const intro = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: "top 75%",
          once: true,
        },
        onComplete: () => {
          introComplete = true;
          if (
            ScrollTrigger.isInViewport(element) &&
            document.visibilityState === "visible" &&
            !interactionRef.current
          ) {
            loop.play();
          }
        },
      });
      ScrollTrigger.create({
        trigger: element,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive && introComplete && document.visibilityState === "visible" && !interactionRef.current) {
            loop.play();
          } else {
            loop.pause();
          }
        },
      });

      scenes.forEach((scene) => {
        const grids = gsap.utils.toArray<SVGPathElement>("[data-grid-line]", scene);
        const stationNodes = gsap.utils.toArray<SVGGElement>("[data-station]", scene);
        const route = scene.querySelector("[data-route]");
        const details = gsap.utils.toArray<SVGElement>(
          [
            ".auditor-pipeline__zone-label",
            ".auditor-pipeline__detail",
            ".auditor-pipeline__code-lines",
            ".auditor-pipeline__verdict-panel",
          ].join(", "),
          scene,
        );
        intro.from(grids, { drawSVG: "0% 0%", duration: 0.8, stagger: 0.008, ease: "none" }, 0);
        intro.from(stationNodes, { y: 14, opacity: 0, duration: 0.55, stagger: 0.12, ease: "power3.out" }, 0.55);
        if (route) intro.from(route, { drawSVG: "0% 0%", duration: 1.2, ease: "power2.inOut" }, 1.15);
        intro.from(details, { opacity: 0, duration: 0.35, stagger: 0.035 }, 2.05);

        const ground = scene.querySelector<SVGGElement>("[data-ground]");
        const routeLayer = scene.querySelector<SVGGElement>("[data-route-layer]");
        const stationLayer = scene.querySelector<SVGGElement>("[data-stations-layer]");
        const packageLayer = scene.querySelector<SVGGElement>("[data-package-parallax]");
        const groundX = gsap.quickTo(ground, "x", { duration: 0.6, ease: "power2.out" });
        const routeX = gsap.quickTo(routeLayer, "x", { duration: 0.6, ease: "power2.out" });
        const stationsX = gsap.quickTo(stationLayer, "x", { duration: 0.6, ease: "power2.out" });
        const packageX = gsap.quickTo(packageLayer, "x", { duration: 0.6, ease: "power2.out" });
        scene.addEventListener("pointermove", (event) => {
          if (event.pointerType !== "mouse") return;
          const rect = scene.getBoundingClientRect();
          const offset = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          groundX(offset * -2);
          routeX(offset * -2);
          stationsX(offset * -2);
          packageX(offset * -2);
        });
        scene.addEventListener("pointerleave", () => {
          groundX(0);
          routeX(0);
          stationsX(0);
          packageX(0);
        });
      });

      const updateVisibility = () => {
        if (document.visibilityState === "hidden") loop.pause();
        else if (ScrollTrigger.isInViewport(element) && introComplete && !interactionRef.current) loop.play();
      };
      document.addEventListener("visibilitychange", updateVisibility);

      const pauseForInteraction = () => {
        interactionRef.current = true;
        loop.pause();
      };
      const resumeAfterInteraction = () => {
        resumeLoop();
      };
      element.addEventListener("pointerover", (event) => {
        if ((event.target as Element).closest("[data-station]")) pauseForInteraction();
      });
      element.addEventListener("pointerout", (event) => {
        const station = (event.target as Element).closest("[data-station]");
        const nextTarget = event.relatedTarget as Node | null;
        if (station && (!nextTarget || !station.contains(nextTarget))) resumeAfterInteraction();
      });
      element.addEventListener("focusin", pauseForInteraction);
      element.addEventListener("focusout", resumeAfterInteraction);

      gsap.utils.toArray<SVGGElement>("[data-station]", element).forEach((station) => {
        station.addEventListener("pointerenter", () => {
          gsap.to(station, { y: -6, duration: 0.25, ease: "power2.out" });
          gsap.to(
            gsap.utils.toArray<SVGGElement>("[data-station]", element).filter((other) => other !== station),
            {
              opacity: 0.45,
              duration: 0.2,
            },
          );
        });
        station.addEventListener("pointerleave", () => {
          gsap.to(station, { y: 0, duration: 0.25, ease: "power2.out" });
          gsap.to(gsap.utils.toArray<SVGGElement>("[data-station]", element), { opacity: 1, duration: 0.2 });
        });
        station.addEventListener("focus", () => {
          gsap.to(station, { y: -6, duration: 0.25, ease: "power2.out" });
          gsap.to(
            gsap.utils.toArray<SVGGElement>("[data-station]", element).filter((other) => other !== station),
            {
              opacity: 0.45,
              duration: 0.2,
            },
          );
        });
        station.addEventListener("blur", () => {
          gsap.to(station, { y: 0, duration: 0.25, ease: "power2.out" });
          gsap.to(gsap.utils.toArray<SVGGElement>("[data-station]", element), { opacity: 1, duration: 0.2 });
        });
      });

      return () => {
        document.removeEventListener("visibilitychange", updateVisibility);
        loopRef.current = null;
        interactionRef.current = false;
      };
    }, element);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", checkVerdictPositions);
      ctx.revert();
    };
  }, [onStepChange, resumeLoop]);

  const activate = (id: string) => {
    setPinned(false);
    pinnedRef.current = false;
    setActive(id);
    activeRef.current = id;
  };

  const release = () => {
    if (!pinned) {
      setActive(null);
      activeRef.current = null;
      resumeLoop();
    }
  };

  const toggle = (id: string) => {
    if (pinned && active === id) {
      setPinned(false);
      pinnedRef.current = false;
      setActive(null);
      activeRef.current = null;
      resumeLoop();
    } else {
      setPinned(true);
      pinnedRef.current = true;
      setActive(id);
      activeRef.current = id;
    }
  };

  return (
    <div ref={root} className={`auditor-pipeline ${reducedMotion ? "is-reduced-motion" : ""}`}>
      <div className="auditor-pipeline__drawing">
        <Scene
          mobile
          reducedMotion={reducedMotion}
          active={active}
          onActivate={activate}
          onRelease={release}
          onToggle={toggle}
        />
        <Scene
          mobile={false}
          reducedMotion={reducedMotion}
          active={active}
          onActivate={activate}
          onRelease={release}
          onToggle={toggle}
        />
      </div>
      <div className="auditor-pipeline__note" aria-live="polite">
        <div className="auditor-pipeline__progress" aria-hidden="true">
          {steps.map((step, index) => (
            <span className={index === shownStep ? "is-current" : ""} key={step.id} />
          ))}
        </div>
        <div className="auditor-pipeline__seals" aria-label="Resultados acumulados">
          {shownSealStep >= 0 && <span className="auditor-pipeline__seal">SKILL.md</span>}
          {shownSealStep >= 1 && (
            <span className="auditor-pipeline__seal" ref={hashSeal}>
              9d2b
            </span>
          )}
          {shownSealStep >= 2 && <span className="auditor-pipeline__seal is-warning">3 avisos</span>}
          {shownSealStep >= 3 && <span className="auditor-pipeline__seal is-network">sin red</span>}
          {shownSealStep >= 4 && (
            <span className={`auditor-pipeline__seal is-verdict is-verdict-${verdictIndex}`}>
              {verdicts[verdictIndex]}
            </span>
          )}
        </div>
        <p className="auditor-mono-label">
          {selected ? selected.name : `Paso ${shownStep + 1} de 5 · ${steps[shownStep].name}`}
        </p>
        <p key={selected?.id ?? shownStep}>{selected ? selected.detail : steps[shownStep].detail}</p>
      </div>
    </div>
  );
}
