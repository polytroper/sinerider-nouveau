const math = require("mathjs");

const {
  r2d,
  d2r,
  rotatePoint,
  dot,
  lerp,
  clamp,
  distance,
  distanceSquared,
  normalize,
  isComplex,
  truncate,
  pointSquareDistance,
  incrementalInsert,
  projectPointToSegment
} = require("./helpers");

const debug = false;

const Hit = () => ({
  partner: null,
  type: 0,
  x: 0,
  y: 0,
  centerX: 0,
  centerY: 0,
  partnerX: 0,
  partnerY: 0,
  normalX: 0,
  normalY: 0,
  tangentX: 0,
  tangentY: 0,
  depth: 0
});

const ApplyHitA = intersection => {
  const hit = intersection.hitA;

  hit.partner = intersection.instanceB;
  hit.type = intersection.type;

  hit.x = intersection.hitAX;
  hit.y = intersection.hitAY;

  hit.centerX = intersection.hitX;
  hit.centerY = intersection.hitY;

  hit.partnerX = intersection.hitBX;
  hit.partnerY = intersection.hitBY;

  hit.normalX = intersection.normalX;
  hit.normalY = intersection.normalY;

  hit.tangentX = intersection.tangentX;
  hit.tangentY = intersection.tangentY;

  hit.depth = intersection.depth;
};

const ApplyHitB = intersection => {
  const hit = intersection.hitB;

  hit.partner = intersection.instanceA;
  hit.type = intersection.type;

  hit.x = intersection.hitBX;
  hit.y = intersection.hitBY;

  hit.centerX = intersection.hitX;
  hit.centerY = intersection.hitY;

  hit.partnerX = intersection.hitAX;
  hit.partnerY = intersection.hitAY;

  hit.normalX = -intersection.normalX;
  hit.normalY = -intersection.normalY;

  hit.tangentX = -intersection.tangentX;
  hit.tangentY = -intersection.tangentY;

  hit.depth = intersection.depth;
};

const Intersection = () => ({
  instanceA: null,
  instanceB: null,
  hitA: Hit(),
  hitB: Hit(),
  hitAX: 0,
  hitBX: 0,
  hitAY: 0,
  hitBY: 0,
  hitX: 0,
  hitY: 0,
  normalX: 0,
  normalY: 0,
  tangentX: 0,
  tangentY: 0,
  depth: 0,
  type: 0
});

const intersectPointCircle = (intersection, px, py, cx, cy, cr) => {
  if (debug)
    console.log(
      `Intersecting point ${px}, ${py} with circle ${cx}, ${cy}, ${cr}`
    );

  const x = px - cx;
  const y = py - cy;

  // Compute squared point/circle distance and squared circle radius
  const d2 = x * x + y * y;
  const r2 = cr * cr;

  // Compare squared values for intersection
  const intersecting = d2 < r2;

  if (intersecting) {
    // Compute distance from circle center and circle edge
    const d = math.sqrt(d2);
    const di = cr - d;

    // Compute normals
    const nx = x / d;
    const ny = y / d;

    // Compute hit location on circle edge
    const chx = cx + nx * cr;
    const chy = cy + ny * cr;

    intersection.hitAX = px;
    intersection.hitAY = py;

    intersection.hitBX = chx;
    intersection.hitBY = chy;

    intersection.hitX = (px + chx) / 2;
    intersection.hitY = (py + chy) / 2;

    intersection.normalX = nx;
    intersection.normalY = ny;

    intersection.tangentX = ny;
    intersection.tangentY = -nx;

    intersection.depth = di;

    return true;
  }

  return false;
};

const intersectPointCircleInstances = (
  intersection,
  pointInstance,
  circleInstance,
  type
) => {
  let px = math.re(pointInstance.p);
  let py = math.im(pointInstance.p);

  let cx = math.re(circleInstance.p);
  let cy = math.im(circleInstance.p);
  let cr = circleInstance._physicsRadius;

  if (intersectPointCircle(intersection, px, py, cx, cy, cr)) {
    intersection.instanceA = pointInstance;
    intersection.instanceB = circleInstance;
    intersection.type = type;

    ApplyHitA(intersection);
    ApplyHitB(intersection);

    return true;
  }

  return false;
};

const intersectPointBox = (intersection, px, py, bx, by, bw, bh, ba) => {
  if (debug)
    console.log(
      `Intersecting point ${px}, ${py} with box ${bx}, ${by}, ${bw}, ${bh}, ${ba}`
    );

  return false;
};

const intersectPointBoxInstances = (
  intersection,
  pointInstance,
  boxInstance,
  type
) => {
  let px = math.re(pointInstance.p);
  let py = math.im(pointInstance.p);

  let bx = math.re(boxInstance.p);
  let by = math.im(boxInstance.p);

  let bw = math.re(boxInstance.p);
  let bh = math.im(boxInstance.p);

  let ba = boxInstance.a;

  return intersectPointBox(intersection, px, py, bx, by, bw, bh, ba);
};

const intersectPointGraph = (
  intersection,
  px,
  py,
  sample,
  sampleSlope,
  sampleVelocity
) => {
  if (debug) console.log(`Intersecting point ${px}, ${py} with graph`);

  const gx = px;
  const gy = sample(gx);

  const intersecting = py <= gy;

  if (intersecting) {
    const d = gy - py;

    const slope = sampleSlope(gx);
    const slopeLength = math.sqrt(1 + slope * slope);

    const nx = -slope / slopeLength;
    const ny = 1 / slopeLength;

    intersection.hitAX = px;
    intersection.hitAY = py;

    intersection.hitBX = gx;
    intersection.hitBY = gy;

    intersection.hitX = (px + gx) / 2;
    intersection.hitY = (py + gy) / 2;

    intersection.normalX = nx;
    intersection.normalY = ny;

    intersection.tangentX = ny;
    intersection.tangentY = -nx;

    intersection.depth = d;

    return true;
  }

  return false;
};

const intersectPointGraphInstances = (
  intersection,
  pointInstance,
  graphInstance,
  type
) => {
  if (debug) {
    console.log(
      `Intersecting point on ${pointInstance._physicsLayer} with graph on ${
        graphInstance._physicsLayer
      }:`
    );
    console.log(pointInstance);
    console.log(graphInstance);
  }

  let px = math.re(pointInstance.p);
  let py = math.im(pointInstance.p);

  let { sample, sampleSlope, sampleVelocity } = graphInstance;

  if (
    intersectPointGraph(
      intersection,
      px,
      py,
      sample,
      sampleSlope,
      sampleVelocity
    )
  ) {
    intersection.instanceA = pointInstance;
    intersection.instanceB = graphInstance;
    intersection.type = type;

    ApplyHitA(intersection);
    ApplyHitB(intersection);

    return true;
  }

  return false;
};

const intersectCircleCircle = (intersection, cxA, cyA, crA, cxB, cyB, crB) => {
  if (debug)
    console.log(
      `Intersecting circle ${cxA}, ${cyA}, ${crA} with circle ${cxB}, ${cyB}, ${crB}`
    );

  const d2 = distanceSquared(cxA, cyA, cxB, cyB);

  const rsum = crA + crB;
  const rsum2 = rsum * rsum;

  if (d2 < rsum2) {
    const d = Math.sqrt(d2);
    const di = rsum - d;

    const nx = (cxB - cxA) / di;
    const ny = (cyB - cyA) / di;

    const chxA = cxA - nx * crA;
    const chyA = cyA - ny * crA;

    const chxB = cxB + nx * crB;
    const chyB = cyB + ny * crB;

    intersection.hitAX = chxA;
    intersection.hitAY = chyA;

    intersection.hitBX = chxB;
    intersection.hitBY = chyB;

    intersection.hitX = (chxA + chxB) / 2;
    intersection.hitY = (chyA + chyB) / 2;

    intersection.normalX = nx;
    intersection.normalY = ny;

    intersection.tangentX = ny;
    intersection.tangentY = -nx;

    intersection.depth = di;

    return true;
  }

  return false;
};

const intersectCircleCircleInstances = (
  intersection,
  circleInstanceA,
  circleInstanceB,
  type
) => {
  const oxA = math.re(circleInstanceA._physicsOffset);
  const oyA = math.im(circleInstanceA._physicsOffset);
  const caA = circleInstanceA.a;

  const rotatedOffsetA = rotatePoint(oxA, oyA, caA);

  const cxA = math.re(circleInstanceA.p) + rotatedOffsetA[0];
  const cyA = math.im(circleInstanceA.p) + rotatedOffsetA[1];
  const crA = circleInstanceA._physicsRadius;

  const oxB = math.re(circleInstanceB._physicsOffset);
  const oyB = math.im(circleInstanceB._physicsOffset);
  const caB = circleInstanceB.a;

  const rotatedOffsetB = rotatePoint(oxB, oyB, caB);

  const cxB = math.re(circleInstanceB.p) + rotatedOffsetB[0];
  const cyB = math.im(circleInstanceB.p) + rotatedOffsetB[1];
  const crB = circleInstanceB._physicsRadius;

  if (intersectCircleCircle(intersection, cxA, cyA, crA, cxB, cyB, crB)) {
    intersection.instanceA = circleInstanceA;
    intersection.instanceB = circleInstanceB;
    intersection.type = type;

    ApplyHitA(intersection);
    ApplyHitB(intersection);

    return true;
  }

  return false;
};

const intersectCircleBox = (intersection, cx, cy, cr, bx, by, bw, bh, ba) => {
  if (debug)
    console.log(
      `Intersecting circle ${cx}, ${cy}, ${cr} with box ${bx}, ${by}, ${bw}, ${bh}, ${ba}`
    );

  let tcx = cx - bx;
  let tcy = cy - by;

  let transformed = rotatePoint(tcx, tcy, -ba);

  tcx = transformed[0];
  tcy = transformed[1];

  const ex = bw / 2;
  const ey = bh / 2;

  const insideX = tcx < ex && tcx > -ex;
  const insideY = tcy < ey && tcy > -ey;
  const inside = insideX && insideY;

  const closestX = clamp(-ex, ex, tcx);
  const closestY = clamp(-ey, ey, tcy);

  // Should actually ensure clamp to edges for points inside box, currently does not
  const tbhx = closestX;
  const tbhy = closestY;

  const d2 = distanceSquared(tcx, tcy, closestX, closestY);
  const r2 = cr * cr;

  if (inside || d2 < r2) {
    if (inside && debug) {
      console.log("Intersecting inside");
    }
    if (d2 < r2 && debug) {
      console.log("Intersecting edge");
    }

    const d = Math.sqrt(d2);
    const di = cr - d;

    const tnx = (cx - closestX) / di;
    const tny = (cy - closestY) / di;

    const tchx = cx - tnx * cr;
    const tchy = cy - tny * cr;

    transformed = rotatePoint(tnx, tny, ba);

    const nx = transformed[0];
    const ny = transformed[1];

    transformed = rotatePoint(tchx, tchy, ba);

    const chx = transformed[0];
    const chy = transformed[1];

    transformed = rotatePoint(tbhx, tbhy, ba);

    const bhx = transformed[0];
    const bhy = transformed[1];

    intersection.hitAX = chx;
    intersection.hitAY = chy;

    intersection.hitBX = bhx;
    intersection.hitBY = bhy;

    intersection.hitX = (bhx + chx) / 2;
    intersection.hitY = (bhy + chy) / 2;

    intersection.normalX = nx;
    intersection.normalY = ny;

    intersection.tangentX = ny;
    intersection.tangentY = -nx;

    intersection.depth = di;

    return true;
  }

  return false;
};

const intersectCircleBoxInstances = (
  intersection,
  circleInstance,
  boxInstance,
  type
) => {
  const oxA = math.re(circleInstance._physicsOffset);
  const oyA = math.im(circleInstance._physicsOffset);
  const aA = circleInstance.a;

  let transformed = rotatePoint(oxA, oyA, aA);

  const xA = math.re(circleInstance.p) + transformed[0];
  const yA = math.im(circleInstance.p) + transformed[1];
  const rA = circleInstance._physicsRadius;

  const oxB = math.re(boxInstance._physicsOffset);
  const oyB = math.im(boxInstance._physicsOffset);
  const aB = boxInstance.a;

  transformed = rotatePoint(oxB, oyB, aB);

  const xB = math.re(boxInstance.p) + transformed[0];
  const yB = math.im(boxInstance.p) + transformed[1];
  const wB = math.re(boxInstance._physicsSize);
  const hB = math.im(boxInstance._physicsSize);

  if (intersectCircleBox(intersection, xA, yA, rA, xB, yB, wB, hB, aB)) {
    intersection.instanceA = circleInstance;
    intersection.instanceB = boxInstance;
    intersection.type = type;

    ApplyHitA(intersection);
    ApplyHitB(intersection);

    if (debug) {
      console.log("Intersection found: ");
      console.log(intersection);
    }

    return true;
  }

  return false;
};

const intersectCircleGraph = (
  intersection,
  cx,
  cy,
  cr,
  sample,
  sampleSlope,
  sampleVelocity
) => {
  if (debug) console.log(`Intersecting circle ${cx}, ${cy}, ${cr} with graph`);

  const cxMin = cx - cr;
  const cxMax = cx + cr;

  const segmentCount = 5;

  let sampleAX = cxMin;
  let sampleAY = sample(sampleAX);
  let sampleBX = 0;
  let sampleBY = 0;

  let hitCount = 0;
  let hitWeightTotal = 0;
  let hitX = 0;
  let hitY = 0;

  for (let i = 0; i < segmentCount; i++) {
    sampleBX = lerp(cxMin, cxMax, (i + 1) / segmentCount);
    sampleBY = sample(sampleBX);

    const projection = projectPointToSegment(
      cx,
      cy,
      sampleAX,
      sampleAY,
      sampleBX,
      sampleBY
    );

    if (projection.d < cr) {
      let hitWeight = 1 - projection.d / cr;
      hitWeightTotal += hitWeight;
      hitX += projection.x * hitWeight;
      hitY += projection.y * hitWeight;
      hitCount++;
    }

    sampleAX = sampleBX;
    sampleAY = sampleBY;
  }

  hitX /= hitWeightTotal;
  hitY /= hitWeightTotal;

  if (hitCount > 0) {
    const di = distance(cx, cy, hitX, hitY);
    const d = cr - di;

    const nx = (cx - hitX) / di;
    const ny = (cy - hitY) / di;

    const chx = cx - nx * cr;
    const chy = cy - ny * cr;

    intersection.hitAX = chx;
    intersection.hitAY = chy;

    intersection.hitBX = hitX;
    intersection.hitBY = hitY;

    intersection.hitX = (hitX + chx) / 2;
    intersection.hitY = (hitY + chy) / 2;

    intersection.normalX = nx;
    intersection.normalY = ny;

    intersection.tangentX = ny;
    intersection.tangentY = -nx;

    intersection.depth = (d + d) / 2;

    return true;
  }

  return false;
};

const intersectCircleGraphInstances = (
  intersection,
  circleInstance,
  graphInstance,
  type
) => {
  const cx = math.re(circleInstance.p);
  const cy = math.im(circleInstance.p);
  const cr = circleInstance._physicsRadius;

  const { sample, sampleSlope, sampleVelocity } = graphInstance;

  if (
    intersectCircleGraph(
      intersection,
      cx,
      cy,
      cr,
      sample,
      sampleSlope,
      sampleVelocity
    )
  ) {
    intersection.instanceA = circleInstance;
    intersection.instanceB = graphInstance;
    intersection.type = type;

    ApplyHitA(intersection);
    ApplyHitB(intersection);

    return true;
  }

  return false;
};

const intersectionTests = {
  point: {
    point: null,
    circle: intersectPointCircleInstances,
    box: intersectPointBoxInstances,
    graph: intersectPointGraphInstances
  },
  circle: {
    point: null,
    circle: intersectCircleCircleInstances,
    box: intersectCircleBoxInstances,
    graph: intersectCircleGraphInstances
  },
  box: {
    point: null,
    circle: null,
    box: null,
    graph: null
  },
  graph: {
    point: null,
    circle: null,
    box: null,
    graph: null
  }
};

module.exports = {
  Intersection,
  intersectionTests
};
