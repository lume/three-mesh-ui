
/*
Component that construct VR controllers from a XR-enabled renderer
*/

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

export default function VRControl( renderer, camera ) {

	let module;

	const controllers = [];
	const controllerGrips = [];

	const controllerModelFactory = new XRControllerModelFactory();

	//////////////////////////
	// Pointing rays helpers
	//////////////////////////

	const material = new THREE.MeshBasicMaterial( {
		color: 0xffffff,
		alphaMap: new THREE.CanvasTexture( generateRayTexture() ),
		transparent: true
	});

	const geometry = new THREE.BoxBufferGeometry( 0.004, 0.004, 0.35 );

	geometry.translate( 0, 0, -0.15 );

	const uvAttribute = geometry.attributes.uv;
		
	for ( var i = 0; i < uvAttribute.count; i ++ ) {
			
	    var u = uvAttribute.getX( i );
	    var v = uvAttribute.getY( i );
				
	    [ u, v ] = (()=> {
	    	switch ( i ) {
	    		case 0 : return [ 1, 1 ]
	    		case 1 : return [ 0, 0 ]
	    		case 2 : return [ 1, 1 ]
	    		case 3 : return [ 0, 0 ]
	    		case 4 : return [ 0, 0 ]
	    		case 5 : return [ 1, 1 ]
	    		case 6 : return [ 0, 0 ]
	    		case 7 : return [ 1, 1 ]
	    		case 8 : return [ 0, 0 ]
	    		case 9 : return [ 0, 0 ]
	    		case 10 : return [ 1, 1 ]
	    		case 11 : return [ 1, 1 ]
	    		case 12 : return [ 1, 1 ]
	    		case 13 : return [ 1, 1 ]
	    		case 14 : return [ 0, 0 ]
	    		case 15 : return [ 0, 0 ]
	    		default : return [ 0, 0 ]
	    	};
	    })();
				
	    uvAttribute.setXY( i, u, v );
			
	};

	const pointingRayHelper = new THREE.Mesh( geometry, material );

	/////////////////
	// Point helper
	/////////////////

	const spriteMap = new THREE.CanvasTexture( generatePointerTexture() );

	const spriteMaterial = new THREE.SpriteMaterial({
		map: spriteMap,
		sizeAttenuation: false,
		depthFunc: THREE.AlwaysDepth
	});

	const pointer = new THREE.Sprite( spriteMaterial );

	pointer.scale.set(0.015, 0.015, 1)

	////////////////
	// Controllers
	////////////////

	const controller1 = renderer.xr.getController( 0 );
	const controller2 = renderer.xr.getController( 1 );

	const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
	const controllerGrip2 = renderer.xr.getControllerGrip( 1 );

	if ( controller1 ) controllers.push( controller1 );
	if ( controller2 ) controllers.push( controller2 );

	if ( controllerGrip1 ) controllerGrips.push( controllerGrip1 );
	if ( controllerGrip2 ) controllerGrips.push( controllerGrip2 );

	controllers.forEach( (controller)=> {

		const ray = pointingRayHelper.clone();
		const point = pointer.clone();

		controller.add( ray, point );
		controller.userData.ray = ray;
		controller.userData.point = point;

	});

	controllerGrips.forEach( (controllerGrip)=> {
		controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
	});

	controller1.addEventListener( 'selectstart', onSelectStart );
	controller1.addEventListener( 'selectend', onSelectEnd );

	controller2.addEventListener( 'selectstart', onSelectStart );
	controller2.addEventListener( 'selectend', onSelectEnd );

	window.addEventListener( 'mousedown', onSelectStart );
	window.addEventListener( 'mouseup', onSelectEnd );

	function onSelectStart() {
		console.log( "onSelectStart" )
		module.handleSelectStart();
	};

	function onSelectEnd() {
		module.handleSelectEnd();
	};

	//////////////
	// Functions
	//////////////

	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	const planeIntersect = new THREE.Vector3();
	const dummyVec = new THREE.Vector3();
	const dummyMatrix = new THREE.Matrix4();

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	window.addEventListener( 'mousemove', onMouseMove, false );

	function onMouseMove( event ) {

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	};

	// Public function that get called from outside, with an array of objects to intersect.
	// If intersects, returns the intersected object. Position the helper at the intersection poit

	function intersect( objects ) {

		if ( !objects ) return null

		const targets = [];

		const meshes = objects.filter((obj)=> {
			return obj.type === 'Mesh';
		});

		const planes = objects.filter((obj)=> {
			return obj.normal !== undefined && obj.constant !== undefined
		});

		// If immersion is on, then we check intersection with the controllers.
		// Otherwise, we emulate them with the mouse

		if ( renderer.xr.isPresenting ) {
			
			controllers.forEach( (controller)=> {

				// Position the intersection ray

				dummyMatrix.identity().extractRotation( controller.matrixWorld );

				raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
				raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( dummyMatrix );

				// Intersect

				const target = intersectObjects( meshes, planes );

				// Position the helper and return the intersected object if any

				if ( target ) {

					const localVec = controller.worldToLocal( target.point );
					controller.userData.point.position.copy( localVec );
					controller.userData.point.visible = true;

					targets.push( target );

				} else {

					controller.userData.point.visible = false;

					return null

				};

			})

		} else {

			raycaster.setFromCamera( mouse, camera );

			const target = intersectObjects( meshes, planes );

			return target || null

		};

	};

	//

	function intersectObjects( meshes, planes ) {

		let target = raycaster.intersectObjects( meshes )[0];

		// Rays must be intersected manually as its not supported by raycaster.intersectObjects

		planes.forEach( (plane)=> {

			const intersection = raycaster.ray.intersectPlane( plane, planeIntersect );
			if ( intersection ) dummyVec.copy( intersection );

			if ( intersection ) {

				const distance = dummyVec.sub( raycaster.ray.origin ).length();

				if ( target && target.distance > distance ) {

					target = {
						point: new THREE.Vector3().copy( intersection ),
						distance: distance
					};

				} else if ( !target ) {

					target = {
						point: new THREE.Vector3().copy( intersection ),
						distance: distance
					};

				};

			};

		});

		return target

	};

	//

	module = {
		controllers,
		controllerGrips,
		intersect,
		handleSelectStart: ()=> {},
		handleSelectEnd: ()=> {}
	};

	return module

};


// Generate the texture needed to make the intersection ray fade away

function generateRayTexture() {

	var canvas = document.createElement( 'canvas' );
	canvas.width = 64;
	canvas.height = 64;

	var ctx = canvas.getContext("2d");

	var grd = ctx.createLinearGradient(0, 0, 64, 0);
	grd.addColorStop(0, "black");
	grd.addColorStop(1, "white");

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, 64, 64);

	return canvas;

};

// Generate the texture of the point helper sprite

function generatePointerTexture() {

	var canvas = document.createElement( 'canvas' );
	canvas.width = 64;
	canvas.height = 64;

	var ctx = canvas.getContext("2d");

	ctx.beginPath();
	ctx.arc(32, 32, 29, 0, 2 * Math.PI);
	ctx.lineWidth = 5;
	ctx.stroke();
	ctx.fillStyle = "white";
	ctx.fill();

	return canvas;

};