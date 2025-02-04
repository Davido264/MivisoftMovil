import Geolocation from 'react-native-geolocation-service';

const getLocation = () => {
  Geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log(latitude, longitude);  // Muestra las coordenadas
      setLocation({ latitude, longitude });  // Guarda la ubicación en el estado
    },
    (error) => {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      console.error(error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
};
