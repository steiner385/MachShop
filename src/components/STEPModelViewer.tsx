/**
 * STEP Model 3D Viewer Component
 * Issue #220 Phase 4: 3D CAD model visualization with PMI annotations
 *
 * Features:
 * - 3D model rendering (STEP files)
 * - PMI (Product Manufacturing Information) visualization
 * - GD&T annotation overlays
 * - Manufacturing operation highlighting
 * - Model view state persistence
 * - Measurement tools
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STEPModel, PMIData, ModelViewState } from '../types/step-ap242';

export interface STEPModelViewerProps {
  stepData: STEPModel;
  pmiData?: PMIData;
  onViewStateChange?: (viewState: ModelViewState) => void;
  highlightedOperationId?: string;
  measurementMode?: boolean;
  showPMI?: boolean;
  showGDT?: boolean;
  zoom?: number;
}

export interface ViewerState {
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  zoom: number;
  visibleParts: Set<string>;
  highlightedFeatures: Set<string>;
  annotations: AnnotationOverlay[];
}

export interface AnnotationOverlay {
  id: string;
  type: 'dimension' | 'tolerance' | 'feature' | 'annotation';
  position: THREE.Vector3;
  text: string;
  color?: string;
  visible: boolean;
}

const STEPModelViewer: React.FC<STEPModelViewerProps> = ({
  stepData,
  pmiData,
  onViewStateChange,
  highlightedOperationId,
  measurementMode = false,
  showPMI = true,
  showGDT = true,
  zoom = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const pmiLayerRef = useRef<THREE.Group | null>(null);

  const [viewerState, setViewerState] = useState<ViewerState>({
    cameraPosition: { x: 0, y: 0, z: 100 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    zoom: 1,
    visibleParts: new Set(),
    highlightedFeatures: new Set(),
    annotations: []
  });

  /**
   * Initialize THREE.js scene
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.set(
      viewerState.cameraPosition.x,
      viewerState.cameraPosition.y,
      viewerState.cameraPosition.z
    );
    camera.lookAt(
      viewerState.cameraTarget.x,
      viewerState.cameraTarget.y,
      viewerState.cameraTarget.z
    );
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 10, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // PMI layer
    const pmiLayer = new THREE.Group();
    pmiLayer.name = 'PMI_LAYER';
    scene.add(pmiLayer);
    pmiLayerRef.current = pmiLayer;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  /**
   * Load STEP model geometry
   */
  useEffect(() => {
    if (!sceneRef.current || !stepData) return;

    // Clear previous model
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
    }

    // Create model group
    const modelGroup = new THREE.Group();
    modelGroup.name = 'STEP_MODEL';

    // Create geometries from STEP features
    if (stepData.features && Array.isArray(stepData.features)) {
      stepData.features.forEach((feature: any) => {
        const geometry = createGeometryFromFeature(feature);
        if (geometry) {
          const material = new THREE.MeshStandardMaterial({
            color: highlightedOperationId === feature.operationId ? 0xff0000 : 0x1f77b4,
            metalness: 0.4,
            roughness: 0.6
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData = { featureId: feature.id, operationId: feature.operationId };
          modelGroup.add(mesh);
        }
      });
    }

    sceneRef.current.add(modelGroup);
    modelRef.current = modelGroup;

    // Fit camera to model
    fitCameraToObject(cameraRef.current!, modelGroup);
  }, [stepData, highlightedOperationId]);

  /**
   * Load and display PMI annotations
   */
  useEffect(() => {
    if (!pmiLayerRef.current || !pmiData || !showPMI) return;

    // Clear previous PMI
    while (pmiLayerRef.current.children.length > 0) {
      pmiLayerRef.current.removeChild(pmiLayerRef.current.children[0]);
    }

    // Add dimension annotations
    if (pmiData.dimensions && Array.isArray(pmiData.dimensions)) {
      pmiData.dimensions.forEach((dim: any) => {
        const sprite = createDimensionSprite(dim);
        if (sprite) {
          pmiLayerRef.current!.add(sprite);
        }
      });
    }

    // Add GD&T annotations
    if (showGDT && pmiData.gdtAnnotations && Array.isArray(pmiData.gdtAnnotations)) {
      pmiData.gdtAnnotations.forEach((gdt: any) => {
        const sprite = createGDTSprite(gdt);
        if (sprite) {
          pmiLayerRef.current!.add(sprite);
        }
      });
    }

    // Add feature annotations
    if (pmiData.features && Array.isArray(pmiData.features)) {
      pmiData.features.forEach((feat: any) => {
        const sprite = createFeatureSprite(feat);
        if (sprite) {
          pmiLayerRef.current!.add(sprite);
        }
      });
    }
  }, [pmiData, showPMI, showGDT]);

  /**
   * Update zoom level
   */
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom = zoom;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  /**
   * Handle camera position changes
   */
  useEffect(() => {
    if (!cameraRef.current) return;

    const onMouseMove = (event: MouseEvent) => {
      if (event.buttons === 2) { // Right mouse button
        const deltaX = event.movementX * 0.01;
        const deltaY = event.movementY * 0.01;

        cameraRef.current!.position.x -= deltaX;
        cameraRef.current!.position.y += deltaY;
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const direction = event.deltaY > 0 ? 1 : -1;

      const distance = cameraRef.current!.position.length();
      const newDistance = Math.max(1, Math.min(1000, distance + direction * distance * zoomSpeed));
      const ratio = newDistance / distance;

      cameraRef.current!.position.multiplyScalar(ratio);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  /**
   * Save view state
   */
  const saveViewState = () => {
    if (!cameraRef.current) return;

    const newViewState: ModelViewState = {
      id: `view_${Date.now()}`,
      operationId: highlightedOperationId || '',
      cameraPosition: {
        x: cameraRef.current.position.x,
        y: cameraRef.current.position.y,
        z: cameraRef.current.position.z
      },
      cameraTarget: {
        x: viewerState.cameraTarget.x,
        y: viewerState.cameraTarget.y,
        z: viewerState.cameraTarget.z
      },
      zoom: cameraRef.current.zoom,
      visibleComponents: Array.from(viewerState.visibleParts),
      annotations: viewerState.annotations,
      timestamp: new Date()
    };

    onViewStateChange?.(newViewState);
  };

  /**
   * Reset view to fit all
   */
  const resetView = () => {
    if (cameraRef.current && modelRef.current) {
      fitCameraToObject(cameraRef.current, modelRef.current);
    }
  };

  return (
    <div className="step-model-viewer">
      <div
        ref={containerRef}
        className="viewer-canvas"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0'
        }}
      />

      <div className="viewer-controls">
        <button onClick={resetView} title="Reset view to fit all">
          ⌖ Fit All
        </button>
        <button onClick={saveViewState} title="Save current view state">
          ☑ Save View
        </button>
        <label>
          <input
            type="checkbox"
            checked={showPMI}
            onChange={(e) => console.log('PMI toggle:', e.target.checked)}
          />
          Show PMI
        </label>
        <label>
          <input
            type="checkbox"
            checked={showGDT}
            onChange={(e) => console.log('GDT toggle:', e.target.checked)}
          />
          Show GD&T
        </label>
      </div>
    </div>
  );
};

/**
 * Create THREE.js geometry from STEP feature
 */
function createGeometryFromFeature(feature: any): THREE.BufferGeometry | null {
  try {
    // This would parse feature geometry from STEP data
    // For now, return a placeholder box geometry
    if (feature.type === 'hole') {
      return new THREE.CylinderGeometry(feature.radius || 5, feature.radius || 5, 10, 32);
    } else if (feature.type === 'pocket') {
      return new THREE.BoxGeometry(feature.width || 10, feature.depth || 10, feature.height || 5);
    } else {
      return new THREE.BoxGeometry(10, 10, 10);
    }
  } catch (error) {
    console.error('Failed to create geometry:', error);
    return null;
  }
}

/**
 * Create dimension annotation sprite
 */
function createDimensionSprite(dimension: any): THREE.Sprite | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = '#000000';
    context.font = 'bold 18px Arial';
    context.textAlign = 'center';
    context.fillText(`${dimension.value || 0}${dimension.unit || 'mm'}`, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    if (dimension.position) {
      sprite.position.set(
        dimension.position.x || 0,
        dimension.position.y || 0,
        dimension.position.z || 0
      );
    }

    return sprite;
  } catch (error) {
    console.error('Failed to create dimension sprite:', error);
    return null;
  }
}

/**
 * Create GD&T annotation sprite
 */
function createGDTSprite(gdt: any): THREE.Sprite | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = '#ffffcc';
    context.fillRect(0, 0, 256, 96);
    context.fillStyle = '#cc0000';
    context.font = 'bold 16px Arial';
    context.textAlign = 'center';
    context.fillText(gdt.type || 'POSITION', 128, 30);
    context.font = '12px Arial';
    context.fillText(`${gdt.tolerance || 0.1}`, 128, 55);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    if (gdt.position) {
      sprite.position.set(
        gdt.position.x || 0,
        gdt.position.y || 0,
        gdt.position.z || 0
      );
    }

    return sprite;
  } catch (error) {
    console.error('Failed to create GDT sprite:', error);
    return null;
  }
}

/**
 * Create feature annotation sprite
 */
function createFeatureSprite(feature: any): THREE.Sprite | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = '#ccccff';
    context.fillRect(0, 0, 256, 64);
    context.fillStyle = '#0000cc';
    context.font = 'bold 14px Arial';
    context.textAlign = 'center';
    context.fillText(feature.name || 'Feature', 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    if (feature.center) {
      sprite.position.set(
        feature.center.x || 0,
        feature.center.y || 0,
        feature.center.z || 0
      );
    }

    return sprite;
  } catch (error) {
    console.error('Failed to create feature sprite:', error);
    return null;
  }
}

/**
 * Fit camera to object
 */
function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  padding = 1.2
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const distance = maxDim / 2 / Math.tan(fov / 2) * padding;

  const center = box.getCenter(new THREE.Vector3());
  camera.position.copy(center);
  camera.position.z += distance;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

export default STEPModelViewer;
