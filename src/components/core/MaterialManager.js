/*

Job:
- Host the materials of a given component.
- Update a component's materials clipping planes
- When materials attributes are updated, update the material

Knows:
- Its component materials
- Its component ancestors clipping planes

*/

import { ShaderMaterial } from 'three/src/materials/ShaderMaterial.js';

//

export default function MaterialManager() {

	return {
		getBackgroundMaterial,
		getFontMaterial,
		updateBackgroundMaterial,
		updateTextMaterial,
		updateClippingPlanes
	}

}

// Update existing backgroundMaterial uniforms

function updateBackgroundMaterial() {

	if ( this.backgroundUniforms ) {

		this.backgroundUniforms.u_texture.value = this.getBackgroundTexture();
		this.backgroundUniforms.u_color.value = this.getBackgroundColor();
		this.backgroundUniforms.u_opacity.value = this.getBackgroundOpacity();

	}

}

// Update existing fontMaterial uniforms

function updateTextMaterial() {

	if ( this.textUniforms ) {

		this.textUniforms.u_texture.value = this.getFontTexture();
		this.textUniforms.u_color.value = this.getFontColor();
		this.textUniforms.u_opacity.value = this.getFontOpacity();

	}

}

// Update a component's materials clipping planes.
// Called every frame

function updateClippingPlanes( value ) {

	const newClippingPlanes = value !== undefined ? value : this.getClippingPlanes();

	if ( JSON.stringify( newClippingPlanes ) !== JSON.stringify( this.clippingPlanes ) ) {

		this.clippingPlanes = newClippingPlanes;

		if ( this.fontMaterial ) this.fontMaterial.clippingPlanes = this.clippingPlanes;

		if ( this.backgroundMaterial ) this.backgroundMaterial.clippingPlanes = this.clippingPlanes;

	}

}

//

function getBackgroundMaterial() {

	const newUniforms = {
		'u_texture': this.getBackgroundTexture(),
		'u_color': this.getBackgroundColor(),
		'u_opacity': this.getBackgroundOpacity()
	}

	if ( !this.backgroundMaterial || !this.backgroundUniforms ) {

		this.backgroundMaterial = makeBackgroundMaterial.call( this, newUniforms );

	} else if (
		newUniforms.u_texture !== this.backgroundUniforms.u_texture.value ||
		newUniforms.u_color !== this.backgroundUniforms.u_color.value ||
		newUniforms.u_opacity !== this.backgroundUniforms.u_opacity.value
	) {

		this.updateBackgroundMaterial();

	}

	return this.backgroundMaterial

}

//

function getFontMaterial() {

	const newUniforms = {
		'u_texture': this.getFontTexture(),
		'u_color': this.getFontColor(),
		'u_opacity': this.getFontOpacity()
	};

	if ( !this.fontMaterial || !this.textUniforms ) {

		this.fontMaterial = makeTextMaterial.call( this, newUniforms );

	} else if (
		newUniforms.u_texture !== this.textUniforms.u_texture.value ||
		newUniforms.u_color !== this.textUniforms.u_color.value ||
		newUniforms.u_opacity !== this.textUniforms.u_opacity.value
	) {

		this.updateTextMaterial();

	}

	return this.fontMaterial

}

//

function makeTextMaterial( materialOptions ) {

	this.textUniforms = {
		'u_texture': { value: materialOptions.u_texture },
		'u_color': { value: materialOptions.u_color },
		'u_opacity': { value: materialOptions.u_opacity }
	}

	/*
	setInterval( ()=> {
		this.textUniforms.u_color.value.set( 0xffffff * Math.random() );
	}, 100 )
	*/

	return new ShaderMaterial({
		uniforms: this.textUniforms,
		transparent: true,
		clipping: true,
		vertexShader: textVertex,
		fragmentShader: textFragment
	})

}

//

function makeBackgroundMaterial( materialOptions ) {

	this.backgroundUniforms = {
		'u_texture': { value: materialOptions.u_texture },
		'u_color': { value: materialOptions.u_color },
		'u_opacity': { value: materialOptions.u_opacity }
	};

	/*
	setInterval( ()=> {
		this.backgroundUniforms.u_color.value.set( 0xffffff * Math.random() );
	}, 100 )
	*/

	return new ShaderMaterial({
		uniforms: this.backgroundUniforms,
		transparent: true,
		clipping: true,
		vertexShader: backgroundVertex,
		fragmentShader: backgroundFragment
	})

}

////////////////
// Text shaders
////////////////

const textVertex = `
	varying vec2 vUv;

	#include <clipping_planes_pars_vertex>

	void main() {

		vUv = uv;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;
		gl_Position.z-= 0.005;

		#include <clipping_planes_vertex>

	}
`;

//

const textFragment = `
	#ifdef GL_OES_standard_derivatives
	#extension GL_OES_standard_derivatives : enable
	#endif

	uniform sampler2D u_texture;
	uniform vec3 u_color;
	uniform float u_opacity;

	varying vec2 vUv;

	#include <clipping_planes_pars_fragment>

	float median(float r, float g, float b) {
		return max(min(r, g), min(max(r, g), b));
	}

	void main() {

		vec3 sample = texture2D( u_texture, vUv ).rgb;
		float sigDist = median( sample.r, sample.g, sample.b ) - 0.5;
		float alpha = clamp( sigDist / fwidth( sigDist ) + 0.5, 0.0, 1.0 );
		gl_FragColor = vec4( u_color, min( alpha, u_opacity ) );
	
		#include <clipping_planes_fragment>

	}
`;

//////////////////////
// Background shaders
//////////////////////

const backgroundVertex = `
	varying vec2 vUv;

	#include <clipping_planes_pars_vertex>

	void main() {

		vUv = uv;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;

		#include <clipping_planes_vertex>

	}
`;

//

const backgroundFragment = `
	#ifdef GL_OES_standard_derivatives
	#extension GL_OES_standard_derivatives : enable
	#endif

	uniform sampler2D u_texture;
	uniform vec3 u_color;
	uniform float u_opacity;

	varying vec2 vUv;

	#include <clipping_planes_pars_fragment>

	void main() {

		vec4 sample = texture2D( u_texture, vUv ).rgba;

		vec4 color = vec4( u_color, u_opacity );

		gl_FragColor = mix( color, sample, sample.a );
	
		#include <clipping_planes_fragment>

	}
`;
