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

uniform int frame;
uniform float height;
uniform float width;

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

    vec2 r2 = vec2(0.);
    r2.x = fbm( st + 20.0*r1 + vec2(1.7,9.2) + 0.15 *time);
    r2.y = fbm( st + 25.0*r1 + vec2(8.3,2.8) + 0.15 *time);

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
  float x = gl_FragCoord.x + - width / 2.0;
  float z = gl_FragCoord.y - height / 2.0;
  float coastZ = width / 7.5 - width/2.0;

  float interpBand = width / 25.0;

  x = x / magnify[0] + offset[0];
  z = z / magnify[0];

  float time = float(frame) / 60.0;

  float coastNoise1 = (150.0 + 7.5*jagged*fbm(time / 3.0 * wind / 8.0 +z/100.0)+7.5* jagged*fbm(time / 3.0 * wind / 8.0-z/100.0)) * fbm((z-400.0)/200.0);
  float coastNoise2 = coastNoise1;

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
    vec3 sand_color = getSandColor(x, z);
    vec3 water_color = getWaterColor(x,z, 1.0, weight);

    vec3 mix_color = vec3(0);
    mix_color = mix(sand_color, water_color, weight);
    gl_FragColor = vec4(mix_color, .1);
  }
}
