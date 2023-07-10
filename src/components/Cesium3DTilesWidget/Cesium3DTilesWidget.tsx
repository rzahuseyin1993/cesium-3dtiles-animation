import { useEffect, useState } from 'react';
import {
  Viewer,
  Globe,
  Entity,
  BillboardGraphics,
  Cesium3DTileset,
  ScreenSpaceCameraController,
  Moon,
  CameraLookAt,
  Clock,
  PolylineGraphics,
  CameraFlyToBoundingSphere,
} from 'resium';
import {
  Cartesian3,
  VerticalOrigin,
  Viewer as CesiumViewer,
  HeadingPitchRange,
  Math as CesiumMath,
  sampleTerrainMostDetailed,
  Cartographic,
  createWorldTerrain,
  Color,
  BoundingSphere,
} from 'cesium';

import './cesium-custom.css';

import { GOOGLE_API_KEY } from 'consts';

import iconMarker from './icons/marker.svg';

type Cesiuum3DTilesWidgetProps = {
  position: {
    longitude: number;
    latitude: number;
    height?: number; // height from ground,  ground = 0
  };
  offset?: {
    heading?: number;
    pitch?: number; // min:-90, max:-5
    range?: number; // min:10, max:100000 meters
  };
  speed?: number; // 1, 2, 3, 4, ...
};

const Cesium3DTilesWidget = (props: Cesiuum3DTilesWidgetProps) => {
  const { position, offset, speed } = props;
  const [viewer, setViewer] = useState<CesiumViewer | null | undefined>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [groundPosition, setGroundPosition] = useState<Cartesian3 | null>(null);
  const [markerPosition, setMarkerPosition] = useState<Cartesian3 | null>(null);
  const [isFlyEnded, setIsFlyEnded] = useState<boolean>(false);
  const handleMarkerPosition = async () => {
    if (viewer) {
      const updatedPositions = await sampleTerrainMostDetailed(
        viewer.terrainProvider,
        [Cartographic.fromDegrees(position.longitude, position.latitude)],
      );
      const updatedPosition = updatedPositions[0];
      const newGroundPosition = Cartographic.toCartesian(updatedPosition);
      setGroundPosition(newGroundPosition);
      if (position.height) {
        updatedPosition.height += position.height;
      }
      const newMarkerPosition = Cartographic.toCartesian(updatedPosition);
      setMarkerPosition(newMarkerPosition);
    }
  };

  useEffect(() => {
    if (isLoading) {
      handleMarkerPosition();
    }
  }, [isLoading]);

  useEffect(() => {
    if (viewer) {
      setTimeout(() => {
        setIsLoading(true);
      }, 5000);
    }
  }, [viewer]);

  return (
    <Viewer
      ref={e => {
        const newViewer = e && e.cesiumElement;
        setViewer(newViewer);
      }}
      // full={true}
      homeButton={false}
      sceneModePicker={false}
      timeline={false}
      animation={false}
      fullscreenButton={false}
      infoBox={false}
      navigationHelpButton={false}
      baseLayerPicker={false}
      geocoder={false}
      terrainProvider={createWorldTerrain()}
      style={{ width: '100%', height: '100%' }}
    >
      <ScreenSpaceCameraController
        minimumZoomDistance={10}
        maximumZoomDistance={100000}
      />
      <Moon show={false} />
      <Globe
        depthTestAgainstTerrain={true}
        maximumScreenSpaceError={5}
        // onTileLoadProgress={handleTilesLoad}
      />

      <CameraLookAt
        target={Cartesian3.fromDegrees(position.longitude, position.latitude)}
        offset={new HeadingPitchRange(0, CesiumMath.toRadians(-45), 2000)}
        once={true}
      />
      <Cesium3DTileset
        url={`https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`}
        showCreditsOnScreen={true}
      />
      {groundPosition && markerPosition && (
        <>
          <CameraFlyToBoundingSphere
            boundingSphere={new BoundingSphere(groundPosition)}
            offset={
              new HeadingPitchRange(
                offset?.heading ?? 0,
                CesiumMath.toRadians(offset?.pitch ?? -20),
                offset?.range ?? 500,
              )
            }
            duration={5}
            onComplete={() => setIsFlyEnded(true)}
          />
          <Entity>
            <PolylineGraphics
              positions={[groundPosition, markerPosition]}
              width={1}
              material={Color.WHITE}
            />
          </Entity>
          <Entity position={markerPosition}>
            <BillboardGraphics
              image={iconMarker}
              verticalOrigin={VerticalOrigin.BOTTOM}
              scale={1.2}
            />
          </Entity>
        </>
      )}

      <Clock
        shouldAnimate={isFlyEnded} // Animation on by default
        onTick={() => {
          if (viewer && groundPosition) {
            // viewer.camera.rotate(Cartesian3.UNIT_Z, CesiumMath.toRadians(-0.5));
            const DEFAULT_PITCH = offset?.pitch
              ? CesiumMath.toRadians(offset.pitch)
              : CesiumMath.toRadians(-20);
            let pitch = viewer.camera.pitch;
            if (pitch > DEFAULT_PITCH + 0.02) {
              pitch -= 0.015;
            } else if (pitch < DEFAULT_PITCH - 0.02) {
              pitch += 0.03;
            } else {
              pitch = DEFAULT_PITCH;
            }
            let range = Cartesian3.distance(
              viewer.camera.positionWC,
              groundPosition,
            );
            let newOffset = {
              heading:
                viewer.camera.heading -
                CesiumMath.toRadians(speed ? speed * 0.1 : 0.1),
              pitch: pitch,
              range: range,
            };
            viewer.camera.lookAt(groundPosition, newOffset);
          }
        }}
      />
    </Viewer>
  );
};

export default Cesium3DTilesWidget;
