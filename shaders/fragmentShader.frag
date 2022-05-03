// set the precision of the float values (necessary if using float)
//#ifdef GL_FRAGMENT_PRECISION_HIGH
//precision highp float;
//#else
precision mediump float;
//#endif
precision mediump int;
uniform float u_time;       // Time in seconds since load
uniform vec2 u_resolution;


uniform vec3 water_color1;
uniform vec3 water_color2;
uniform vec3 water_color3;
uniform vec3 water_color4;

uniform vec3 sand_color1;
uniform vec3 sand_color2;
uniform vec3 sand_color3;
uniform vec3 sand_color4;

uniform vec2 magnify;
uniform vec2 offset;

uniform vec2 clickCoord;
uniform int clickFrame;

uniform float wind;
uniform float jagged;

// flag for using soft shadows (set to 1 only when using soft shadows)
#define SOFT_SHADOWS 0

// define number of soft shadow samples to take
#define SOFT_SAMPLING 3

// define constant parameters
// EPS is for the precision issue
#define INFINITY 1.0e+12
#define EPS 1.0e-3

// define maximum recursion depth for rays
#define MAX_RECURSION 8

// define constants for scene setting
#define MAX_LIGHTS 10

// define texture types
#define NONE 0
#define CHECKERBOARD 1
#define MYSPECIAL 2
#define MYSPECIALCOAST 4
#define FBM 3

// define material types
#define BASICMATERIAL 1
#define PHONGMATERIAL 2
#define LAMBERTMATERIAL 3

// define reflect types - how to bounce rays
#define NONEREFLECT 1
#define MIRRORREFLECT 2
#define GLASSREFLECT 3

struct Shape {
  int shapeType;
  vec3 v1;
  vec3 v2;
  float rad;
};

struct Material {
  int materialType;
  vec3 color;
  float shininess;
  vec3 specular;

  int materialReflectType;
  float reflectivity;
  float refractionRatio;
  int special;
};

struct Object {
  Shape shape;
  Material material;
};

struct Light {
  vec3 position;
  vec3 color;
  float intensity;
  float attenuate;
};

struct Ray {
  vec3 origin;
  vec3 direction;
};

struct Intersection {
  vec3 position;
  vec3 normal;
};

// uniform
uniform mat4 uMVMatrix;
uniform int frame;
uniform float height;
uniform float width;
uniform vec3 camera;
uniform int numObjects;
uniform int numLights;
uniform Light lights[MAX_LIGHTS];
uniform vec3 objectNorm;

// varying
varying vec2 v_position;

// find then position some distance along a ray
vec3 rayGetOffset(Ray ray, float dist) {
  return ray.origin + (dist * ray.direction);
}

// if a newly found intersection is closer than the best found so far, record
// the new intersection and return true; otherwise leave the best as it was and
// return false.
bool chooseCloserIntersection(float dist, inout float best_dist,
                              inout Intersection intersect,
                              inout Intersection best_intersect) {
  if (best_dist <= dist)
    return false;
  best_dist = dist;
  best_intersect.position = intersect.position;
  best_intersect.normal = intersect.normal;
  return true;
}

// put any general convenience functions you want up here
// ----------- STUDENT CODE BEGIN ------------
// ----------- Our reference solution uses 118 lines of code.
// ----------- STUDENT CODE END ------------

// forward declaration
float rayIntersectScene(Ray ray, out Material out_mat,
                        out Intersection out_intersect);

// Plane
// this function can be used for plane, triangle, and box
float findIntersectionWithPlane(Ray ray, vec3 norm, float dist,
                                out Intersection intersect) {
  float a = dot(ray.direction, norm);
  float b = dot(ray.origin, norm) - dist;

  if (a < EPS && a > -EPS)
    return INFINITY;

  float len = -b / a;
  if (len < EPS)
    return INFINITY;

  intersect.position = rayGetOffset(ray, len);
  intersect.normal = norm;
  return len;
}

// Triangle
float findIntersectionWithTriangle(Ray ray, vec3 t1, vec3 t2, vec3 t3,
                                   out Intersection intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 28 lines of code.
  // currently reports no intersection
  // get normal vector of triangle plane and distance of plane to origin
  vec3 t12 = t1-t2;
  vec3 t23 = t2-t3;
  vec3 norm = normalize(cross(t12, t23));
  float dist = dot(norm, t1);

  // determine if ray intersects with plane
  Intersection temp;
  float len = findIntersectionWithPlane(ray, norm, dist, temp);
  if (len == INFINITY) return INFINITY;

  // if ray intersects with plane, calculate point of intesection P. Then, use algorithm 2 to check each side if point is in triangle
  vec3 P = rayGetOffset(ray, len);

  vec3 V1 = t1 - P;
  vec3 V2 = t2 - P;
  vec3 V3 = t3 - P;
  vec3 N12 = normalize(cross(V2, V1));
  vec3 N23 = normalize(cross(V3, V2));
  vec3 N31 = normalize(cross(V1, V3));

  // if point is outisde triangle, return INFINITY, else update intersect and return length
  if (dot(ray.direction, N12) < EPS || dot(ray.direction, N23) < EPS || dot(ray.direction, N31) < EPS)
    return INFINITY;
  else {
    intersect.position = P;
    intersect.normal = norm;
  }

  return len;
  // ----------- STUDENT CODE END ------------
}

// Sphere
float findIntersectionWithSphere(Ray ray, vec3 center, float radius,
                                 out Intersection intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 25 lines of code.
  // currently reports no intersection
  // follow algorithm described in lecture
  // first calclate tca, the distance from the ray origin to a point that forms a perpendicular line with the center of the sphere
  // if this distnace is less than 0, return INFINITY
  vec3 L = center - ray.origin;
  float tca = dot(L, ray.direction);
  if (tca < EPS) return INFINITY;

  // calculate the square distance of the line connecting the center of the sphere to make the perpendicular line with the ray
  // if this distance is greater than the radius, return INFINITY
  float d2 = dot(L, L) - tca*tca;
  float r2 = radius*radius;
  if (d2 > r2) return INFINITY;


  // calculate thc, the distance from this perpendicular point to the edge of the sphere
  float thc = sqrt(r2-d2);

  // now have 2 possible points, use the nearest positive one to calculate the intersection position, normal, and length
  float t1 = tca - thc;
  float t2 = tca + thc;

  float len;
  if (t1 > EPS){
    intersect.position = rayGetOffset(ray, t1);
    intersect.normal = normalize(intersect.position-center);
    len = t1;
    return len;
  }
  else if (t2 > EPS){
    intersect.position = rayGetOffset(ray, t2);
    intersect.normal = normalize(intersect.position-center);
    len = t2;
    return len;
  }

  return INFINITY;

  // ----------- STUDENT CODE END ------------
}

// helper function to check if ray intersects with a side of the box
float intersectionBoxSide(vec3 v1, vec3 v2, vec3 v3, int axis, 
                          inout float best_dist, out Intersection out_intersect,
                          Ray ray, vec3 pmin, vec3 pmax){
  // calculate plane that contains box side
  vec3 v12 = v1-v2;
  vec3 v32 = v3-v2;
  vec3 norm = normalize(cross(v12, v32));
  float dist = dot(norm, v1);

  // check if ray intersects with plane
  Intersection temp;
  float len = findIntersectionWithPlane(ray, norm, dist, temp);

  // depending on the axes that the box side is parallel to, check that the point lies within the min and max value for those axes.
  // if so, get the closest intersection that has been found so far.
  if (axis == 0){
    if (temp.position[1] > pmin[1] && temp.position[1] < pmax[1] && temp.position[2] > pmin[2] && 
        temp.position[2] < pmax[2]) chooseCloserIntersection(len, best_dist, temp, out_intersect);
  }
  if (axis == 1){
    if (temp.position[0] > pmin[0] && temp.position[0] < pmax[0] && temp.position[2] > pmin[2] && 
        temp.position[2] < pmax[2]) chooseCloserIntersection(len, best_dist, temp, out_intersect);
  }
  if (axis == 2){
    if (temp.position[0] > pmin[0] && temp.position[0] < pmax[0] && temp.position[1] > pmin[1] && 
        temp.position[1] < pmax[1]) chooseCloserIntersection(len, best_dist, temp, out_intersect);
  }
  
  return best_dist;
}

// Box
float findIntersectionWithBox(Ray ray, vec3 pmin, vec3 pmax,
                              out Intersection out_intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // pmin and pmax represent two bounding points of the box
  // pmin stores [xmin, ymin, zmin] and pmax stores [xmax, ymax, zmax]
  // ----------- Our reference solution uses 44 lines of code.
  // currently reports no intersection

  // check each side if the ray intersects with it. update the best dist to be the smallest distance after checking each side
  float best_dist = INFINITY;
  // front
  vec3 v1 = vec3(pmin[0], pmax[1], pmin[2]);
  vec3 v2 = vec3(pmin[0], pmin[1], pmin[2]);
  vec3 v3 = vec3(pmax[0], pmin[1], pmin[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 2, best_dist, out_intersect, ray, pmin, pmax);

  // back
  v1 = vec3(pmin[0], pmax[1], pmax[2]);
  v2 = vec3(pmin[0], pmin[1], pmax[2]);
  v3 = vec3(pmax[0], pmin[1], pmax[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 2, best_dist, out_intersect, ray, pmin, pmax);

  // top
  v1 = vec3(pmin[0], pmin[1], pmax[2]);
  v2 = vec3(pmin[0], pmin[1], pmin[2]);
  v3 = vec3(pmax[0], pmin[1], pmin[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 1, best_dist, out_intersect, ray, pmin, pmax);

  // bottom
  v1 = vec3(pmin[0], pmax[1], pmax[2]);
  v2 = vec3(pmin[0], pmax[1], pmin[2]);
  v3 = vec3(pmax[0], pmax[1], pmin[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 1, best_dist, out_intersect, ray, pmin, pmax);

  // left
  v1 = vec3(pmin[0], pmin[1], pmax[2]);
  v2 = vec3(pmin[0], pmin[1], pmin[2]);
  v3 = vec3(pmin[0], pmax[1], pmin[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 0, best_dist, out_intersect, ray, pmin, pmax);

  // right
  v1 = vec3(pmax[0], pmin[1], pmax[2]);
  v2 = vec3(pmax[0], pmin[1], pmin[2]);
  v3 = vec3(pmax[0], pmax[1], pmin[2]);
  best_dist = intersectionBoxSide(v1, v2, v3, 0, best_dist, out_intersect, ray, pmin, pmax);

  return best_dist;
  // ----------- STUDENT CODE END ------------
}

// Cylinder
float getIntersectOpenCylinder(Ray ray, vec3 center, vec3 axis, float len,
                               float rad, out Intersection intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 33 lines of code.
  // currently reports no intersection
  // follow the algorithm described in the assignment spec
  // calculate parameters theta, vd, and phi
  float theta = dot(axis, ray.direction);
  vec3 vd = ray.origin - center;
  float phi = dot(vd, axis);

  // calculate a, b, c using equations in spec
  vec3 a_vec = ray.direction - theta*axis;
  float a = dot(a_vec, a_vec);

  float b = 2.0 * dot(ray.direction - theta*axis, vd - phi*axis);
  
  vec3 c_vec = vd - phi*axis;
  float c = dot(c_vec, c_vec) - rad*rad;

  // use quadratic formula to determine two solutions for t
  float t1 = (-b - sqrt(b*b - 4.0*a*c)) / (2.0*a);
  float t2 = (-b + sqrt(b*b - 4.0*a*c)) / (2.0*a);

  // use the smallest positive t to check if intersection exists in finite cylinder. no need to account for case that the closer t would fall outside but
  // larger t will be inside because in that case, the cap will be the closest intersection.
  float dist;
  if (t1 > EPS) {
    dist = t1;
  }
  else if (t2 > EPS){
    dist = t2;
  }
  else return INFINITY;

  // using the closest t, calculate the point of intersection and check if it is contained by the finite cylinder
  vec3 q = rayGetOffset(ray, dist);
  if (dot(axis, q-center) < EPS || dot(axis, q-(center + axis*len)) > EPS) return INFINITY;

  // update position and normal. normal is calculated by calculating the vector that connects the intersection point with the axis at a 90 angle.
  intersect.position = q;
  vec3 q_center = q - center;
  vec3 proj = dot(q_center, axis) / dot(axis, axis) * axis;

  intersect.normal = normalize(q - proj - center);
  return dist;
  // ----------- STUDENT CODE END ------------
}

float getIntersectDisc(Ray ray, vec3 center, vec3 norm, float rad,
                       out Intersection intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 18 lines of code.
  // currently reports no intersection
  // calculate dist of plane to origin. then check if point intersect with plane.
  float dist = dot(center, norm);

  float len = findIntersectionWithPlane(ray, norm, dist, intersect);
  
  // if so, check if distance between intersection point and center of disc is less than radius
  if (distance(intersect.position,center) > rad) return INFINITY;
  
  return len;
  // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCylinder(Ray ray, vec3 center, vec3 apex,
                                   float radius,
                                   out Intersection out_intersect) {
  vec3 axis = apex - center;
  float len = length(axis);
  axis = normalize(axis);

  Intersection intersect;
  float best_dist = INFINITY;
  float dist;

  // -- infinite cylinder
  dist = getIntersectOpenCylinder(ray, center, axis, len, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  // -- two caps
  dist = getIntersectDisc(ray, center, -axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);
  dist = getIntersectDisc(ray, apex, axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);
  return best_dist;
}

// Cone
float getIntersectOpenCone(Ray ray, vec3 apex, vec3 axis, float len,
                           float radius, out Intersection intersect) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 45 lines of code.
  // currently reports no intersection
  // follow algorithm provided in assignment specs
  // calcualate variables vd, phi, theta, and alpha (half-angle)
  vec3 vd = ray.origin - apex;
  float phi = dot(vd, axis);
  float theta = dot(ray.direction, axis);
  float alpha = atan(radius/len);

  float cos2a = cos(alpha) * cos(alpha);
  float sin2a = sin(alpha) * sin(alpha);

  // calcualte a, b, c using equations provided
  vec3 a_vec = ray.direction - theta*axis;
  vec3 c_vec = vd - phi*axis;

  float a = dot(a_vec, a_vec) * cos2a - theta*theta*sin2a;
  float b = 2.0 * (dot(a_vec, c_vec)*cos2a - theta*phi*sin2a);
  float c = dot(c_vec, c_vec) * cos2a - phi*phi*sin2a;

  // use quadratic equation to calculate two solutions for t
  float t1 = (-b - sqrt(b*b - 4.0*a*c)) / (2.0*a);
  float t2 = (-b + sqrt(b*b - 4.0*a*c)) / (2.0*a);

  // use smallest positive t to move forward and check if intersection lies between apex and cap.
  float dist;
  if (t1 > EPS) {
    dist = t1;
  }
  else if (t2 > EPS){
    dist = t2;
  }
  else return INFINITY;


  // calculate point of intersection and check that it lies in the finite single cone.
  vec3 q = rayGetOffset(ray, dist);
  if (dot(axis, q-apex) < EPS || dot(axis, q-( apex + axis*len)) > EPS) return INFINITY;

  // update position, normal, and return t. 
  intersect.position = q;
  float x = q[0] - apex[0];
  float z = q[1] - apex[1];
  float y = q[2] - apex[2];
  vec3 normal = vec3(2.0*x, -2.0*radius*radius*z/(len*len), 2.0*y);

  intersect.normal = normalize(normal);
  return dist;
  // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCone(Ray ray, vec3 center, vec3 apex, float radius,
                               out Intersection out_intersect) {
  vec3 axis = center - apex;
  float len = length(axis);
  axis = normalize(axis);

  // -- infinite cone
  Intersection intersect;
  float best_dist = INFINITY;
  float dist;

  // -- infinite cone
  dist = getIntersectOpenCone(ray, apex, axis, len, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  // -- caps
  dist = getIntersectDisc(ray, center, axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  return best_dist;
}

vec3 calculateSpecialDiffuseColor(Material mat, vec3 posIntersection,
                                  vec3 normalVector) {
  // ----------- STUDENT CODE BEGIN ------------
  if (mat.special == CHECKERBOARD) {
    // ----------- Our reference solution uses 7 lines of code.
    float tileSize = 8.0;

    // discretize point of intersection into grid, scale by tileSize
    float x = floor(posIntersection[0]/tileSize + EPS);
    float y = floor(posIntersection[1]/tileSize + EPS);
    float z = floor(posIntersection[2]/tileSize + EPS);

    // depending on parity of x+y+z, return average of original color and black or the original color
    if (mod(x+y+z,2.0) < EPS) return (vec3(0.0, 0.0, 0.0)+mat.color)/2.0;
    else return mat.color; //white square

  } else if (mat.special == MYSPECIAL) {
    return mat.color;
  }

  // If not a special material, just return material color.
  return mat.color;
  // ----------- STUDENT CODE END ------------
}

vec3 calculateDiffuseColor(Material mat, vec3 posIntersection,
                           vec3 normalVector) {
  // Special colors
  if (mat.special != NONE) {
    return calculateSpecialDiffuseColor(mat, posIntersection, normalVector);
  }
  return vec3(mat.color);
}

// check if position pos in in shadow with respect to a particular light.
// lightVec is the vector from that position to that light -- it is not
// normalized, so its length is the distance from the position to the light
bool pointInShadow(vec3 pos, vec3 lightVec) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 15 lines of code.
  Material hitMat;
  Intersection intersect;
  // create ray that originates from light and goes in direction to point
  Ray ray;
  ray.origin = pos+lightVec;
  ray.direction = normalize(-lightVec);

  // get distance to first intersection of scene
  float dist = rayIntersectScene(ray, hitMat, intersect);
  float lightDist = length(lightVec);

  // if distance and light distance are the same, mean that first intersection is that point, so point is not in shadow
  // if not, that means ray hit something else before and that point is in shadow.
  if (abs(dist - lightDist) < EPS) {
    return false;
  } else {
    return true;
  }
  return false;
  // ----------- STUDENT CODE END ------------
}

// use random sampling to compute a ratio that represents the
// fractional contribution of the light to the position pos.
// lightVec is the vector from that position to that light -- it is not
// normalized, so its length is the distance from the position to the light
float softShadowRatio(vec3 pos, vec3 lightVec) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 19 lines of code.
  return 0.0;
  // ----------- STUDENT CODE END ------------
}

vec3 getLightContribution(Light light, Material mat, vec3 posIntersection,
                          vec3 normalVector, vec3 eyeVector, bool phongOnly,
                          vec3 diffuseColor) {
  vec3 lightVector = light.position - posIntersection;


  float ratio = 1.0; // default to 1.0 for hard shadows
  if (SOFT_SHADOWS == 1) {
    // if using soft shadows, call softShadowRatio to determine
    // fractional light contribution
    ratio = softShadowRatio(posIntersection, lightVector);
  }
  else {
    // check if point is in shadow with light vector
    if (pointInShadow(posIntersection, lightVector)) {
      return vec3(0.0, 0.0, 0.0);
    }
  }

  // Slight optimization for soft shadows
  if (ratio < EPS) {
    return vec3(0.0, 0.0, 0.0);
  }


  // normalize the light vector for the computations below
  float distToLight = length(lightVector);
  lightVector /= distToLight;

  if (mat.materialType == PHONGMATERIAL ||
      mat.materialType == LAMBERTMATERIAL) {
    vec3 contribution = vec3(0.0, 0.0, 0.0);

    // get light attenuation
    float attenuation = light.attenuate * distToLight;
    float diffuseIntensity =
        max(0.0, dot(normalVector, lightVector)) * light.intensity;

    // glass and mirror objects have specular highlights but no diffuse lighting
    if (!phongOnly) {
      contribution +=
          diffuseColor * diffuseIntensity * light.color / attenuation;
    }

    if (mat.materialType == PHONGMATERIAL) {
      // Start with just black by default (i.e. no Phong term contribution)
      vec3 phongTerm = vec3(0.0, 0.0, 0.0);
      // ----------- STUDENT CODE BEGIN ------------
      // ----------- Our reference solution uses 4 lines of code.
      // get K_s and n from material properties, V and R from the vectors provided, and I_L using the attenuation variable
      vec3 K_s = mat.specular;
      float n = mat.shininess;


      vec3 V = normalize(eyeVector);
      vec3 R = normalize(reflect(-lightVector, normalVector));
      float I_L = light.intensity / attenuation;

      // use equation in precept
      phongTerm += K_s*pow(max(0.0, dot(V,R)),n) * I_L;
      // ----------- STUDENT CODE END ------------
      contribution += phongTerm;
    }

    return ratio * contribution;
  } else {
    return ratio * diffuseColor;
  }
}

vec3 calculateColor(Material mat, vec3 posIntersection, vec3 normalVector,
                    vec3 eyeVector, bool phongOnly) {
  // The diffuse color of the material at the point of intersection
  // Needed to compute the color when accounting for the lights in the scene
  vec3 diffuseColor = calculateDiffuseColor(mat, posIntersection, normalVector);

  // color defaults to black when there are no lights
  vec3 outputColor = vec3(0.0, 0.0, 0.0);

  // Loop over the MAX_LIGHTS different lights, taking care not to exceed
  // numLights (GLSL restriction), and accumulate each light's contribution
  // to the point of intersection in the scene.
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 9 lines of code.
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i == numLights) {
      break;
    }
    outputColor += getLightContribution(lights[i], mat, posIntersection,
                          normalVector, eyeVector, phongOnly,
                          diffuseColor);
  }
  return outputColor;
  // Return diffuseColor by default, so you can see something for now.
  // return diffuseColor;
  // ----------- STUDENT CODE END ------------
}

// find reflection or refraction direction (depending on material type)
vec3 calcReflectionVector(Material material, vec3 direction, vec3 normalVector,
                          bool isInsideObj) {
  if (material.materialReflectType == MIRRORREFLECT) {
    return reflect(direction, normalVector);
  }
  // If it's not mirror, then it is a refractive material like glass.
  // Compute the refraction direction.
  // See lecture 13 slide (lighting) on Snell's law.
  // The eta below is eta_i/eta_r.
  // ----------- STUDENT CODE BEGIN ------------
  // flip refraction ratio if ray is inside object moving out
  float eta =
      (isInsideObj) ? 1.0 / material.refractionRatio : material.refractionRatio;


  // calculate angle of entry
  float theta_i = acos(dot(normalize(normalVector),normalize(direction)));

  // if exceeds critical angle, revert back to reflection
  if (eta*sin(theta_i) > 1.0) {
    return reflect(direction, normalVector);
  }
  
  // calculate angle of exit
  float theta_r = asin(eta*sin(theta_i));

  // calculate vector exiting
  vec3 T = (-eta*cos(theta_i) - cos(theta_r))*normalVector + eta*direction;
  // ----------- Our reference solution uses 5 lines of code.
  // Return mirror direction by default, so you can see something for now.
  return T;
  // ----------- STUDENT CODE END ------------
}

vec3 traceRay(Ray ray) {
  // Accumulate the final color from tracing this ray into resColor.
  vec3 resColor = vec3(0.0, 0.0, 0.0);

  // Accumulate a weight from tracing this ray through different materials
  // based on their BRDFs. Initially all 1.0s (i.e. scales the initial ray's
  // RGB color by 1.0 across all color channels). This captures the BRDFs
  // of the materials intersected by the ray's journey through the scene.
  vec3 resWeight = vec3(1.0, 1.0, 1.0);

  // Flag for whether the ray is currently inside of an object.
  bool isInsideObj = false;

  // Iteratively trace the ray through the scene up to MAX_RECURSION bounces.
  for (int depth = 0; depth < MAX_RECURSION; depth++) {
    // Fire the ray into the scene and find an intersection, if one exists.
    //
    // To do so, trace the ray using the rayIntersectScene function, which
    // also accepts a Material struct and an Intersection struct to store
    // information about the point of intersection. The function returns
    // a distance of how far the ray travelled before it intersected an object.
    //
    // Then, check whether or not the ray actually intersected with the scene.
    // A ray does not intersect the scene if it intersects at a distance
    // "equal to zero" or far beyond the bounds of the scene. If so, break
    // the loop and do not trace the ray any further.
    // (Hint: You should probably use EPS and INFINITY.)
    // ----------- STUDENT CODE BEGIN ------------
    Material hitMat;
    Intersection intersect;
    float dist = rayIntersectScene(ray, hitMat, intersect);
    if (dist < EPS || dist > INFINITY) {
      break;
    }
    // ----------- Our reference solution uses 4 lines of code.
    // ----------- STUDENT CODE END ------------

    // Compute the vector from the ray towards the intersection.
    vec3 posIntersection = intersect.position;
    vec3 normalVector    = intersect.normal;

    vec3 eyeVector = normalize(ray.origin - posIntersection);

    // Determine whether we are inside an object using the dot product
    // with the intersection's normal vector
    if (dot(eyeVector, normalVector) < 0.0) {
        normalVector = -normalVector;
        isInsideObj = true;
    } else {
        isInsideObj = false;
    }

    // Material is reflective if it is either mirror or glass in this assignment
    bool reflective = (hitMat.materialReflectType == MIRRORREFLECT ||
                       hitMat.materialReflectType == GLASSREFLECT);

    // Compute the color at the intersection point based on its material
    // and the lighting in the scene
    vec3 outputColor = calculateColor(hitMat, posIntersection,
      normalVector, eyeVector, reflective);

    // A material has a reflection type (as seen above) and a reflectivity
    // attribute. A reflectivity "equal to zero" indicates that the material
    // is neither reflective nor refractive.

    // If a material is neither reflective nor refractive...
    // (1) Scale the output color by the current weight and add it into
    //     the accumulated color.
    // (2) Then break the for loop (i.e. do not trace the ray any further).
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 4 lines of code.
    if (hitMat.reflectivity < EPS) {
      resColor += (outputColor * resWeight);
      break;
    }
    // ----------- STUDENT CODE END ------------

    // If the material is reflective or refractive...
    // (1) Use calcReflectionVector to compute the direction of the next
    //     bounce of this ray.
    // (2) Update the ray object with the next starting position and
    //     direction to prepare for the next bounfcace. You should modify the
    //     ray's origin and direction attributes. Be sure to normalize the
    //     direction vector.
    // (3) Scale the output color by the current weight and add it into
    //     the accumulated color.
    // (4) Update the current weight using the material's reflectivity
    //     so that it is the appropriate weight for the next ray's color.
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 8 lines of code.
    if (hitMat.reflectivity > EPS || reflective == true) {
      vec3 nextBounce = calcReflectionVector(hitMat, ray.direction, normalVector, isInsideObj);
      ray.origin = posIntersection;
      ray.direction = normalize(nextBounce);
      resColor += outputColor * resWeight;
      resWeight = resWeight * hitMat.reflectivity;
    }
    // ----------- STUDENT CODE END ------------
  }

  return resColor;
}

uniform vec2 mouse;

float hash(float p) { p = fract(p * 0.011); p *= p + 7.5; p *= p + p; return fract(p); }
float hash(vec2 p) {vec3 p3 = fract(vec3(p.xyx) * 0.13); p3 += dot(p3, p3.yzx + 3.333); return fract((p3.x + p3.y) * p3.z); }

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}


float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);

	  float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(float x) {
	float v = 0.0;
	float a = 0.5;
	float shift = float(100);
	for (int i = 0; i < 5; ++i) {
		v += a * noise(x);
		x = x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}

float fbm(vec2 x) {
	float v = 0.0;
	float a = 0.5;
	vec2 shift = vec2(100);

  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for (int i = 0; i < 2; ++i) {
		v += a * noise(x);
		x = rot * x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}

vec3 getSandColor(float x, float z){
    x /= 20.0;
    z /= 20.0;
    float time = float(frame) / 60.0;

    vec2 st = vec2(x, z);

    vec2 q = vec2(0.);
    q.x = fbm( st + vec2(0.0,0.0) );
    q.y = fbm( st + vec2(5.2,1.3) );

    vec2 r = vec2(0.);
    r.x = fbm( st + 4.0*q + vec2(1.7,9.2) );
    r.y = fbm( st + 4.0*q + vec2(8.3,2.8) );
    
    vec2 r1 = vec2(0.);
    r1.x = fbm( st + 10.0*r + vec2(1.7,9.2) + 0.0015 *time);
    r1.y = fbm( st + 15.0*r + vec2(8.3,2.8) + 0.015 *time);
    
    //r1.x = fbm( st + 10.0*r + vec2(1.7,9.2));
    //r1.y = fbm( st + 15.0*r + vec2(8.3,2.8));

    vec2 r2 = vec2(0.);
    r2.x = fbm( st + 20.0*r1 + vec2(1.7,9.2) + 0.15 *time);
    r2.y = fbm( st + 25.0*r1 + vec2(8.3,2.8) + 0.15 *time);
    //r2.x = fbm( st + 20.0*r1 + vec2(1.7,9.2) );
    //r2.y = fbm( st + 25.0*r1 + vec2(8.3,2.8) );




    float v = fbm(st+4.0*r2);

    vec3 color = vec3(0);
    color = mix(sand_color1,
                sand_color2,
                clamp(length(q),0.0,1.0));

    color = mix(color,
                sand_color3,
                clamp(length(r2.y),0.0,1.0));

    color = mix(color,
                sand_color4,
                clamp(length(r2.x),0.0,1.0));

    //float lowVal = 0.5;
    //if(v<lowVal) {v+= 0.5;}
    float w = v*v*v+.2*v*v+.95*v;
    w *=0.25;
    w +=0.95;
    return w*color;

}     
vec3 getWaterColor(float x, float z, float mult, float whiteWeight){
    x /= 20.0;
    z /= 20.0;

    float time = float(frame) / 60.0;

    vec2 st = vec2(x, z);

    vec2 q = vec2(0);
    q.x = fbm(st + 1.464* mult * time); // change constant in front of time for waves
    q.y = fbm(st+vec2(1.0));

    vec2 r = vec2(0);
    r.x = fbm(st + 1.0*q + vec2(1.7,9.2) + 0.15 * mult *time * wind / 2.0);
    r.y = fbm(st + 1.0*q + vec2(8.3,2.8) + 0.096 * mult * time * wind / 2.0);

    float v = fbm(st+7.0*r);

    vec3 color = vec3(0);

    color = mix(vec3(water_color1),
                vec3(water_color2),
                clamp((v*v)*3.0,0.0,1.0));

    color = mix(color,
                vec3(water_color3),
                clamp(length(q),0.0,1.0));
    
    color = mix(color,
                vec3(water_color4),
                clamp(length(r.x),0.0,1.0));

    color = mix(vec3(1),
            color,
            whiteWeight*whiteWeight);

    return (v*v*v+.6*v*v+.5*v)*color;

}

void main() {
  //float cameraFOV = 0.8;
  //vec3 direction = vec3(v_position.x * cameraFOV * width / height, v_position.y * cameraFOV, 1.0);

  //Ray ray;
  //ray.origin = vec3(uMVMatrix * vec4(camera, 1.0));
  //ray.direction = normalize(vec3(uMVMatrix * vec4(direction, 0.0)));

  // trace the ray for this pixel
  //vec3 res = traceRay(ray);

  float x = gl_FragCoord.x + - width / 2.0;
  float z = gl_FragCoord.y - height / 2.0;
  float coastZ = width / 7.5 - width/2.0;

  float interpBand = width / 25.0;

  x = x / magnify[0] + offset[0];
  z = z / magnify[0];

  float time = float(frame) / 60.0;

  float coastNoise1 = (150.0 + 7.5*jagged*fbm(time / 3.0 * wind / 8.0 +z/100.0)+7.5* jagged*fbm(time / 3.0 * wind / 8.0-z/100.0)) * fbm((z-400.0)/200.0);
  float coastNoise2 = coastNoise1;
  // 75.0 * fbm(z/40.0);

  if (x < (coastZ + coastNoise1)){
      vec3 sand_color = getSandColor(x, z);
      gl_FragColor = vec4(sand_color, .1);
  }
  else  if (x > (coastZ+ interpBand + coastNoise2)){
    vec3 water_color = getWaterColor(x,z, 1.0, 1.0);
    float clickSize = 60.0;
    int decayTime = 50;
    float xDist = (gl_FragCoord.x - clickCoord[0]);
    float yDist = ((height - gl_FragCoord.y) - clickCoord[1]);
    float dist = xDist * xDist + yDist * yDist;
    if (dist < clickSize * clickSize && frame - clickFrame < decayTime + 30 ){
        float time_weight = float(frame - clickFrame)/ (float(decayTime)* 0.6) ;
        float dist_weight = (dist) / (clickSize * clickSize *0.9);
        if (dist_weight <= 0.25) {dist_weight = 0.25;}
        vec3 noise_color = getWaterColor(x,z, 4.0, 1.0);
        //noise_color = vec3(0);
        vec3 mix_color = mix(water_color, noise_color, clamp(1.0 - dist_weight * time_weight, 0.0, 1.0));
        gl_FragColor = vec4(mix_color, .1);
    }
    else{ gl_FragColor = vec4(water_color, .1); }

  }
  else{
    float weight = (x - (coastZ+coastNoise1)) / (interpBand+coastNoise2 - coastNoise1);
    //weight *=weight;
    
    vec3 sand_color = getSandColor(x, z);
    vec3 water_color = getWaterColor(x,z, 1.0, weight);

    vec3 mix_color = vec3(0);
    mix_color = mix(sand_color, water_color, weight);
    gl_FragColor = vec4(mix_color, .1);
  }
}
