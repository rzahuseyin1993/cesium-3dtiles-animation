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

import { GoogleMap, LoadScript, MarkerF } from '@react-google-maps/api';

import { GOOGLE_API_KEY } from 'consts';

import iconMarker from './icons/marker.svg';

type Cesiuum3DTilesWidgetProps = {
  position?: {
    longitude: number;
    latitude: number;
    height?: number; // height from ground,  ground = 0
  };
  address?: string;
  offset?: {
    heading?: number;
    pitch?: number; // min:-90, max:-5
    range?: number; // min:10, max:100000 meters
  };
  speed?: number; // 1, 2, 3, 4, ...
};

const Cesium3DTilesWidget = (props: Cesiuum3DTilesWidgetProps) => {
  const { position, address, offset, speed } = props;
  const [widgetPosition, setWidgetPosition] = useState<{
    longitude: number;
    latitude: number;
    height?: number;
  } | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [viewer, setViewer] = useState<CesiumViewer | null | undefined>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogle3DTilesAvailable, setIsGoogle3DTilesAvailable] =
    useState<boolean>(false);
  const [groundPosition, setGroundPosition] = useState<Cartesian3 | null>(null);
  const [markerPosition, setMarkerPosition] = useState<Cartesian3 | null>(null);
  const [isFlyStart, setIsFlyStart] = useState<boolean>(false);
  const [isFlyEnded, setIsFlyEnded] = useState<boolean>(false);

  const handleMarkerPosition = async () => {
    if (viewer && widgetPosition) {
      const updatedPositions = await sampleTerrainMostDetailed(
        viewer.terrainProvider,
        [
          Cartographic.fromDegrees(
            widgetPosition.longitude,
            widgetPosition.latitude,
          ),
        ],
      );
      const updatedPosition = updatedPositions[0];
      const newGroundPosition = Cartographic.toCartesian(updatedPosition);
      setGroundPosition(newGroundPosition);
      updatedPosition.height += widgetPosition.height ?? 5;
      const newMarkerPosition = Cartographic.toCartesian(updatedPosition);
      setMarkerPosition(newMarkerPosition);
    }
  };

  useEffect(() => {
    if (groundPosition && markerPosition) {
      setTimeout(() => {
        setIsFlyStart(true);
      }, 2000);
    }
  }, [groundPosition, markerPosition]);

  useEffect(() => {
    if (isLoading) {
      handleMarkerPosition();
    }
  }, [isLoading]);

  useEffect(() => {
    if (viewer && widgetPosition) {
      setIsLoading(true);
    }
  }, [viewer, widgetPosition]);

  useEffect(() => {
    if (widgetPosition) {
      fetch(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`,
      )
        .then(response => response.json())
        .then(response => {
          setIsChecked(true);
          if (response.error) {
            setIsGoogle3DTilesAvailable(false);
          } else {
            setIsGoogle3DTilesAvailable(true);
          }
        })
        .catch(() => {
          setIsChecked(true);
          setIsGoogle3DTilesAvailable(false);
        });
    }
  }, [widgetPosition]);

  useEffect(() => {
    if (position) {
      setWidgetPosition(position);
      return;
    }
    if (address) {
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`,
      )
        .then(response => response.json())
        .then(response => {
          if (response.status === 'OK') {
            const location = response.results[0].geometry.location;
            setWidgetPosition({
              longitude: location.lng,
              latitude: location.lat,
            });
          }
        });
    }
  }, [position, address]);

  return (
    <>
      {!isChecked ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#333',
          }}
        >
          {/* <div>Loading...</div> */}
        </div>
      ) : isGoogle3DTilesAvailable ? (
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
          {widgetPosition && (
            <CameraLookAt
              target={Cartesian3.fromDegrees(
                widgetPosition.longitude,
                widgetPosition.latitude,
              )}
              offset={
                new HeadingPitchRange(
                  0,
                  CesiumMath.toRadians(
                    offset?.pitch ? Math.max(offset?.pitch - 20, -90) : -45,
                  ),
                  4000,
                )
              }
              once={true}
            />
          )}

          {isGoogle3DTilesAvailable && (
            <Cesium3DTileset
              url={`https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`}
              showCreditsOnScreen={true}
            />
          )}
          {groundPosition && markerPosition && (
            <>
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

          {isFlyStart && groundPosition && (
            <CameraFlyToBoundingSphere
              boundingSphere={new BoundingSphere(groundPosition)}
              offset={
                new HeadingPitchRange(
                  0,
                  CesiumMath.toRadians(offset?.pitch ?? -20),
                  offset?.range ?? 500,
                )
              }
              duration={4}
              onComplete={() => setIsFlyEnded(true)}
            />
          )}
          <Clock
            shouldAnimate={isFlyEnded} // Animation on by default
            onTick={() => {
              if (!viewer || !isFlyEnded || !groundPosition) return;
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
            }}
          />
        </Viewer>
      ) : (
        <LoadScript googleMapsApiKey={GOOGLE_API_KEY}>
          {widgetPosition && (
            <GoogleMap
              mapContainerStyle={{
                width: '100%',
                height: '100%',
              }}
              options={{
                mapTypeControl: false,
                mapTypeId: 'satellite',
                fullscreenControl: false,
                zoomControl: false,
                streetViewControl: false,
              }}
              center={{
                lat: widgetPosition.latitude,
                lng: widgetPosition.longitude,
              }}
              zoom={18}
            >
              <MarkerF
                position={{
                  lat: widgetPosition.latitude,
                  lng: widgetPosition.longitude,
                }}
                icon={iconMarker}
              />
            </GoogleMap>
          )}
        </LoadScript>
      )}
    </>
  );
};

export default Cesium3DTilesWidget;
