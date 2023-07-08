import Cesium3DTilesWidget from 'components/Cesium3DTilesWidget/Cesium3DTilesWidget';

const App = () => {
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="w-1/2 h-1/2">
        <Cesium3DTilesWidget
          position={{
            longitude: -122.5593279,
            latitude: 37.9531765,
            height: 10,
          }}
          offset={{ heading: 0, pitch: -20, range: 200 }}
          speed={3}
        />
      </div>
    </div>
  );
};

export default App;
