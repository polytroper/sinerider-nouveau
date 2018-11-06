var _ = require("lodash");
const math = require("mathjs");
const { Intersection, intersectionTests } = require("./intersections");

const {
  r2d,
  d2r,
  dot,
  lerp,
  normalize,
  isComplex,
  truncate,
  pointSquareDistance,
  incrementalInsert,
  projectPointToSegment
} = require("./helpers");

const PhysicsContext = () => {
  const debug = false;

  const shapes = ["point", "circle", "box", "graph"];

  const layers = ["world", "player", "goals", "player_trigger"];
  const layerInstances = _.fromPairs(_.map(layers, v => [v, []]));
  const layerInstanceCounts = _.fromPairs(_.map(layers, v => [v, 0]));

  const layerMatrix = [
    [2, 2, 2, 0, _],
    [_, 2, 0, 0, _],
    [_, _, 0, 1, _],
    [_, _, _, 0, _],
    [_, _, _, _, _]
  ];
  const layerPairs = [];

  for (let i = 0; i < layers.length; i++) {
    for (let j = i; j < layers.length; j++) {
      let m = layerMatrix[i][j];
      if (m > 0) {
        layerPairs.push([layers[i], layers[j], m]);
      }
    }
  }

  var intersectionCount = 0;
  const intersections = [];

  var pairCount = 0;
  const pairs = [];

  const resolvePointGraph = (instance, hit) => {
    if (debug) {
      console.log(`Resolving Point-Graph hit:`);
      console.log(instance);
      console.log(hit);
    }

    const {
      partner,
      x,
      y,
      partnerX,
      partnerY,
      normalX,
      normalY,
      tangentX,
      tangentY,
      depth
    } = hit;
    const { sampleVelocity } = partner;

    const position = instance.p;
    const velocity = instance.v;
    const upright = instance._physicsUpright;

    let positionX = position.re;
    let positionY = position.im;

    let velocityX = velocity.re;
    let velocityY = velocity.im;

    let uprightX = upright.re;
    let uprightY = upright.im;

    const groundVelocityX = 0;
    const groundVelocityY = sampleVelocity(positionX);

    const depenetrationX = 0;
    const depenetrationY = partnerY - positionY;

    if (debug) {
      console.log(`VALUES
      Position=(${positionX}, ${positionY})
      Velocity=(${velocityX}, ${velocityY})
      Normal=(${normalX}, ${normalY})
      Tangent=(${tangentX}, ${tangentY})
      Depenetration=(${depenetrationX}, ${depenetrationY})
      `);
    }

    const tangentScalar = dot(velocityX, velocityY, tangentX, tangentY);
    const normalScalar = dot(velocityX, velocityY, normalX, normalY);
    const groundVelocityScalar = dot(
      groundVelocityX,
      groundVelocityY,
      normalX,
      normalY
    );
    const depenetrationScalar = dot(
      depenetrationX,
      depenetrationY,
      normalX,
      normalY
    );

    velocityX = tangentX * tangentScalar;
    velocityY = math.max(velocityY, tangentY * tangentScalar);

    velocityX += normalX * groundVelocityScalar;
    velocityY += normalY * groundVelocityScalar;

    positionX += normalX * depenetrationScalar;
    positionY += normalY * depenetrationScalar;

    uprightX = lerp(uprightX, normalX, 0.08);
    uprightY = lerp(uprightY, normalY, 0.08);

    const uprightMagnitude = math.hypot(uprightX, uprightY);

    uprightX /= uprightMagnitude;
    uprightY /= uprightMagnitude;

    const uprightAngle = math.atan2(-uprightX, uprightY);

    instance.a = uprightAngle;

    upright.re = uprightX;
    upright.im = uprightY;

    position.re = positionX;
    position.im = positionY;

    velocity.re = velocityX;
    velocity.im = velocityY;
  };

  const resolveCircleGraph = (instance, hit) => {
    if (debug) {
      console.log(`Resolving Circle-Graph hit:`);
      console.log(instance);
      console.log(hit);
    }

    const {
      partner,
      x,
      y,
      partnerX,
      partnerY,
      normalX,
      normalY,
      tangentX,
      tangentY,
      depth
    } = hit;
    const { sampleVelocity } = partner;

    const position = instance.p;
    const velocity = instance.v;

    let positionX = position.re;
    let positionY = position.im;

    let velocityX = velocity.re;
    let velocityY = velocity.im;

    const groundVelocityX = 0;
    const groundVelocityY = sampleVelocity(x);

    const depenetrationX = normalX * depth;
    const depenetrationY = normalY * depth;

    if (debug) {
      console.log(`VALUES
      Position=(${positionX}, ${positionY})
      Velocity=(${velocityX}, ${velocityY})
      Normal=(${normalX}, ${normalY})
      Tangent=(${tangentX}, ${tangentY})
      Depenetration=(${depenetrationX}, ${depenetrationY})
      `);
    }

    const tangentScalar = dot(velocityX, velocityY, tangentX, tangentY);
    const normalScalar = dot(velocityX, velocityY, normalX, normalY);
    const groundVelocityScalar = dot(
      groundVelocityX,
      groundVelocityY,
      normalX,
      normalY
    );
    const depenetrationScalar = dot(
      depenetrationX,
      depenetrationY,
      normalX,
      normalY
    );

    velocityX = tangentX * tangentScalar;
    velocityY = math.max(velocityY, tangentY * tangentScalar);

    velocityX += normalX * groundVelocityScalar;
    velocityY += normalY * groundVelocityScalar;

    positionX += normalX * depenetrationScalar;
    positionY += normalY * depenetrationScalar;

    position.re = positionX;
    position.im = positionY;

    velocity.re = velocityX;
    velocity.im = velocityY;
  };

  const resolveCircleCircle = (instance, hit) => {
    if (debug) {
      console.log(`Resolving Circle-Circle hit:`);
      console.log(instance);
      console.log(hit);
    }

    const {
      partner,
      x,
      y,
      partnerX,
      partnerY,
      normalX,
      normalY,
      tangentX,
      tangentY,
      depth
    } = hit;

    const partnerVelocity = partner.v;

    const position = instance.p;
    const velocity = instance.v;

    let positionX = position.re;
    let positionY = position.im;

    let velocityX = velocity.re;
    let velocityY = velocity.im;

    const partnerVelocityX = partnerVelocity.re;
    const partnerVelocityY = partnerVelocity.im;

    const depenetrationX = normalX * depth;
    const depenetrationY = normalY * depth;

    if (debug) {
      console.log(`VALUES
      Position=(${positionX}, ${positionY})
      Velocity=(${velocityX}, ${velocityY})
      Normal=(${normalX}, ${normalY})
      Tangent=(${tangentX}, ${tangentY})
      Depenetration=(${depenetrationX}, ${depenetrationY})
      `);
    }

    const tangentScalar = dot(velocityX, velocityY, tangentX, tangentY);
    const normalScalar = dot(velocityX, velocityY, normalX, normalY);
    const partnerVelocityScalar = dot(
      partnerVelocityX,
      partnerVelocityY,
      normalX,
      normalY
    );

    velocityX = tangentX * tangentScalar;
    velocityY = math.max(velocityY, tangentY * tangentScalar);

    velocityX += normalX * partnerVelocityScalar;
    velocityY += normalY * partnerVelocityScalar;

    positionX += depenetrationX;
    positionY += depenetrationY;

    position.re = positionX;
    position.im = positionY;

    velocity.re = velocityX;
    velocity.im = velocityY;
  };

  const resolvers = {
    point: {
      point: null,
      circle: null,
      box: null,
      graph: resolvePointGraph
    },
    circle: {
      point: null,
      circle: resolveCircleCircle,
      box: null,
      graph: resolveCircleGraph
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

  const resolve = instances => {
    _.each(instances, instance => {
      const instanceHits = instance._physicsHits;
      const instanceShape = instance._physicsShape;

      if (instanceHits.length == 0) return;

      if (debug) {
        console.log(
          `Resolving ${instanceHits.length} hits on ${instanceShape} instance`
        );
        console.log(instance);
      }

      _.each(instanceHits, hit => {
        if (hit.type == 1) return;

        const partnerShape = hit.partner._physicsShape;
        const resolver = resolvers[instanceShape][partnerShape];

        if (resolver) resolver(instance, hit);
      });
    });
  };

  const integratePoint = (instance, delta, gravity) => {
    if (debug) {
      // console.log(`Integrating point instance:`);
      // console.log(instance);
    }

    if (!isComplex(instance.p)) instance.p = math.complex(instance.p, 0);
    if (!isComplex(instance.v)) instance.v = math.complex(instance.v, 0);

    const position = instance.p;
    const velocity = instance.v;

    // Move me
    position.re += velocity.re * delta;
    position.im += velocity.im * delta;

    // Gravity
    velocity.im += gravity;
  };

  const integrateCircle = (instance, delta, gravity) => {
    if (debug) {
      // console.log(`Integrating point instance:`);
      // console.log(instance);
    }

    if (!isComplex(instance.p)) instance.p = math.complex(instance.p, 0);
    if (!isComplex(instance.v)) instance.v = math.complex(instance.v, 0);

    const position = instance.p;
    const velocity = instance.v;

    // Move me
    position.re += velocity.re * delta;
    position.im += velocity.im * delta;

    // Gravity
    velocity.im += gravity;
  };

  const integrations = {
    point: integratePoint,
    circle: integrateCircle,
    box: null,
    graph: null
  };

  const integrate = (instances, delta, gravity) => {
    _.each(instances, instance => {
      const shape = instance._physicsShape;
      const integration = integrations[shape];

      if (integration) {
        integration(instance, delta, gravity);
      }
    });
  };

  const inform = instances => {
    _.each(intersections, intersection => {
      const { instanceA, instanceB } = intersection;

      if (debug) {
        console.log(`Informing A/B:`);
        console.log(instanceA);
        console.log(instanceB);
      }

      incrementalInsert(
        instanceA._physicsHits,
        intersection.hitA,
        instanceA._physicsParent._physicsHitCount
      );
      incrementalInsert(
        instanceB._physicsHits,
        intersection.hitB,
        instanceB._physicsParent._physicsHitCount
      );

      instanceA._physicsParent._physicsHitCount++;
      instanceB._physicsParent._physicsHitCount++;
    });

    _.each(instances, instance => {
      instance._physicsHits.length = instance._physicsHitCount;
    });
  };

  const intersect = () => {
    intersectionCount = 0;

    _.each(pairs, pair => {
      const instanceA = pair[0];
      const instanceB = pair[1];
      const type = pair[2];

      const shapeA = instanceA._physicsShape;
      const shapeB = instanceB._physicsShape;

      if (intersectionCount == intersections.length) {
        intersections.push(Intersection());
      }

      const intersection = intersections[intersectionCount];
      const test = intersectionTests[shapeA][shapeB];

      if (test && test(intersection, instanceA, instanceB, type))
        intersectionCount++;
    });

    intersections.length = intersectionCount;

    if (debug) {
      console.log(`Found ${intersectionCount} intersections`);
      console.log(intersections);
    }
  };

  const insertInstanceLayer = (instance, layer) => {
    let layerInstanceArray = layerInstances[layer];
    let layerInstanceCount = layerInstanceCounts[layer];

    incrementalInsert(layerInstanceArray, instance, layerInstanceCount);

    layerInstanceCount++;
    layerInstanceCounts[layer] = layerInstanceCount;
  };

  const layerize = instances => {
    _.each(layers, v => (layerInstanceCounts[v] = 0));

    let layer;

    _.each(instances, instance => {
      layer = instance._physicsLayer;
      insertInstanceLayer(instance, layer);

      const subcolliders = instance._physicsSubcolliders;
      if (subcolliders) {
        _.each(subcolliders, subcollider => {
          layer = subcollider._physicsLayer;
          subcollider.p = instance.p;
          subcollider.v = instance.v;
          subcollider.a = instance.a;
          insertInstanceLayer(subcollider, layer);
        });
      }
    });

    _.each(layers, v => (layerInstances[v].length = layerInstanceCounts[v]));

    if (debug) {
      console.log(`Layers:`);
      console.log(layerInstances);
    }
  };

  const pairify = () => {
    pairCount = 0;
    _.each(layerPairs, layerPair => {
      let layerA = layerPair[0];
      let layerB = layerPair[1];
      let pairType = layerPair[2];

      let layerInstancesA = layerInstances[layerA];
      let layerInstancesB = layerInstances[layerB];

      if (debug) {
        console.log(
          `Checking layer pair ${layerA} (${
            layerInstancesA.length
          }), ${layerB} (${layerInstancesB.length})`
        );
      }

      for (let i = 0; i < layerInstancesA.length; i++) {
        let layerInstanceA = layerInstancesA[i];

        for (let j = 0; j < layerInstancesB.length; j++) {
          let layerInstanceB = layerInstancesB[j];

          if (layerInstanceA != layerInstanceB) {
            if (pairCount == pairs.length) pairs.push([null, null, 0]);

            let pair = pairs[pairCount];

            let shapeIndexA = _.indexOf(shapes, layerInstanceA._physicsShape);
            let shapeIndexB = _.indexOf(shapes, layerInstanceB._physicsShape);

            if (shapeIndexB < shapeIndexA) {
              pair[0] = layerInstanceB;
              pair[1] = layerInstanceA;
            } else {
              pair[0] = layerInstanceA;
              pair[1] = layerInstanceB;
            }

            pair[2] = pairType;
            pairCount++;
          }
        }
      }
    });
    pairs.length = pairCount;

    if (debug) {
      console.log(`Matched ${pairCount} collision pairs:`);
      console.log(pairs);
    }
  };

  const wipe = instances => {
    _.each(instances, instance => {
      instance._physicsHitCount = 0;
    });
  };

  const tick = (instances, delta, gravity) => {
    if (debug) {
      console.log(
        `Ticking ${_.size(instances)} instances by ${math.round(
          delta * 1000
        )}ms at g=${truncate(gravity)}`
      );
    }

    wipe(instances);
    layerize(instances);
    pairify();

    integrate(instances, delta, gravity);
    intersect();
    inform(instances);
    resolve(instances);
  };

  return tick;
};

module.exports = PhysicsContext;
