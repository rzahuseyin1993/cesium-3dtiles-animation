import Cesium3DTilesWidget from 'components/Cesium3DTilesWidget/Cesium3DTilesWidget';

const App = () => {
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="w-1/2 h-1/2">
        <Cesium3DTilesWidget
          // position={{
          //   longitude: 8.7763545,
          //   latitude: 47.5729438,
          //   height: 10,
          // }}
          address="Thurblick 1, 8479 Altikon, Switzerland"
          offset={{ heading: 0, pitch: -20, range: 200 }}
          speed={2}
        />
      </div>
    </div>
  );
};

export default App;
