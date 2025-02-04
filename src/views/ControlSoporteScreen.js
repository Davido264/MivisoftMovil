import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, PermissionsAndroid, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import LocationIcon from '../icons/locationIcon';
import TimeIcon from '../icons/timeIcon';
import UploadIcon from '../icons/uploadIcon';
import CommentIcon from '../icons/commentIcon';
import WebView from 'react-native-webview'; // Para OpenStreetMap
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios'; // Añadido para obtener hora NTP


const ControlSoporteScreen = () => {
  const navigation = useNavigation();

  const [horaSoporte, setHoraSoporte] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [comentario, setComentario] = useState('');
  const [images, setImages] = useState([]);
  const [mensajeLimite, setMensajeLimite] = useState(false);
  const maxCaracteres = 200;
  const [location, setLocation] = useState(null); // Estado para la ubicación
  const [loading, setLoading] = useState(true); // Estado para manejar el indicador de carga
  const [newLocation, setNewLocation] = useState(null); // Nueva ubicación fijada
  const [locationReal, setLocationReal] = useState(null); // Ubicación real del usuario
  const umbralMetros = 5000; // 5 kilómetros en metros


  
  // Función para obtener la hora actual formateada
  const obtenerHoraActual = () => {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', { hour12: false }); // Formato 24 horas
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };
  
  // Solicitar permisos de cámara en tiempo de ejecución
  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Permiso para usar la cámara",
          message: "La aplicación necesita acceder a tu cámara para tomar fotos",
          buttonNeutral: "Preguntar más tarde",
          buttonNegative: "Cancelar",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const camposCompletos = () => {
    return (
      horaSoporte && // Verifica que la hora esté seleccionada
      comentario && // Verifica que el comentario no esté vacío
      images.length > 0 // Verifica que al menos una imagen haya sido subida
    );
  };
  

  // Función para abrir la cámara
  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permiso denegado', 'No tienes permiso para acceder a la cámara.');
      return;
    }

    const options = {
      mediaType: 'photo',
      saveToPhotos: true,
      quality: 1,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        Alert.alert('Cancelado', 'No se tomó ninguna foto.');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else {
        const uri = response.assets[0].uri;
        setImages([...images, uri]);
      }
    });
  };

  // Función para abrir la galería con múltiples imágenes
  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 0,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        Alert.alert('Cancelado', 'No se seleccionó ninguna imagen.');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else {
        const uris = response.assets.map(asset => asset.uri);
        setImages([...images, ...uris]);
      }
    });
  };

  // Solicitar permisos de ubicación y obtener la ubicación del usuario
  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Permiso para acceder a la ubicación",
          message: "La aplicación necesita acceder a tu ubicación para mostrarla en el mapa",
          buttonNeutral: "Preguntar más tarde",
          buttonNegative: "Cancelar",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getLocation();
      } else {
        Alert.alert('Permiso denegado', 'No tienes permiso para acceder a la ubicación.');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Ubicación Real obtenida correctamente:', latitude, longitude);
        setLocationReal({ latitude, longitude }); // Actualiza la ubicación real
        setLoading(false);
      },
      (error) => {
        console.error('Error al obtener la ubicación:', error.code, error.message);
        Alert.alert('Error', `No se pudo obtener la ubicación. Código: ${error.code}, Mensaje: ${error.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );
  };
  

  useEffect(() => {   
    requestLocationPermission();
    setHoraSoporte(obtenerHoraActual());
    obtenerHoraNTP(); // Llamamos a la función para verificar la hora NTP
  }, []);

  useEffect(() => {
    console.log('Ubicación Real obtenida:', locationReal);
    if (locationReal && !newLocation) {
      console.log('Asignando locationReal a newLocation');
      setNewLocation(locationReal); // Asigna la ubicación real si newLocation no tiene valor
    }
  }, [locationReal]);
  
  const injectedJavaScript = `  
  var lat = ${location ? location.latitude : 37.4219983};  // Coordenada predeterminada si no hay ubicación real  
  var lon = ${location ? location.longitude : -122.084};

  // Inicializa el mapa con coordenadas predeterminadas o la ubicación real
  var map = L.map('map').setView([lat, lon], 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Inicializa el marcador en la ubicación real o predeterminada
  var marker = L.marker([lat, lon], {
    draggable: true
  }).addTo(map);

  // Función para centrar el mapa y mover el marcador a una ubicación específica
  function centerMap(lat, lng) {
    map.setView(new L.LatLng(lat, lng), 18);
    marker.setLatLng([lat, lng]);
  }

  // Manejo de eventos para arrastre del marcador
  marker.on('dragstart', function (e) {
    marker.setOpacity(0.7); // Marca el pin como semitransparente mientras se arrastra
  });

  marker.on('drag', function (e) {
    marker.setOpacity(0.7); // Mantener el pin semitransparente durante el arrastre
  });

  marker.on('dragend', function (e) {
    marker.setOpacity(1); // Restaurar opacidad al soltar
    var latlng = marker.getLatLng();

    // Agregar un pequeño retraso antes de fijar la ubicación
    setTimeout(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng }));
    }, 500); // Retraso de 500 ms
  });

  // Crear botón de geolocalización en la esquina superior derecha del mapa
  var locateButton = L.control({position: 'topright'});
  locateButton.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = '<button style="background-color: white; border: none; cursor: pointer; padding: 8px;">📍</button>';
    div.onclick = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'locate' }));
    };
    return div;
  };
  locateButton.addTo(map);

  // Nueva funcionalidad: Si React Native envía coordenadas reales, centra el mapa
  window.addEventListener('message', function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.latitude && data.longitude) {
        console.log('Centrando mapa en:', data.latitude, data.longitude);
        centerMap(data.latitude, data.longitude);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });
`;

const handleMessage = (event) => {
  try {
    console.log('Mensaje recibido del WebView:', event.nativeEvent.data);
    const data = JSON.parse(event.nativeEvent.data);

    if (data.latitude && data.longitude) {
      setNewLocation({ latitude: data.latitude, longitude: data.longitude });
      console.log('Ubicación ingresada en el mapa:', { latitude: data.latitude, longitude: data.longitude });
    } else {
      console.warn('Datos inválidos recibidos desde el mapa:', data);
    }
  } catch (error) {
    console.error('Error al manejar el mensaje del WebView:', error);
  }
};

const calcularDistancia = (coord1, coord2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371; // Radio de la Tierra en km

  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c * 1000; // Devuelve distancia en metros
};


const handleEnviar = async () => {
  if (!camposCompletos()) {
    Alert.alert(
      'Formulario incompleto',
      'Por favor, completa todos los campos antes de enviar.'
    );
    return;
  }

  try {
    console.log('Ubicación Real:', locationReal);
    console.log('Ubicación Ingresada:', newLocation);

    // Verifica que ambas ubicaciones estén disponibles
    if (!locationReal || !newLocation) {
      Alert.alert('Error', 'No se pudieron obtener ambas ubicaciones.');
      return;
    }

    // Cálculo de distancia entre ubicaciones
    const distanciaEnMetros = calcularDistancia(locationReal, newLocation);
    const distanciaEnKm = (distanciaEnMetros / 1000).toFixed(2); // Convertir a kilómetros y redondear a 2 decimales
    console.log(`Distancia calculada: ${distanciaEnKm} kilómetros`);

    const umbralKm = 1; // Tolerancia de 1 kilómetro
    if (distanciaEnKm > umbralKm) {
      console.warn('¡Advertencia! La ubicación ingresada difiere significativamente de la ubicación real.');
    } else {
      console.log('Las ubicaciones coinciden dentro del rango aceptable.');
    }

    // Obtención de hora NTP
    const response = await axios.get('http://timeapi.io/api/Time/current/zone?timeZone=UTC');
    const horaNTP = new Date(response.data.dateTime);
    console.log('Hora NTP obtenida:', horaNTP);

    // Diferencia de hora entre NTP y seleccionada
    const diferenciaMs = Math.abs(selectedTime - horaNTP);
    const diferenciaMinutos = (diferenciaMs / 1000 / 60).toFixed(2); // Convertir a minutos y redondear a 2 decimales

    console.log('Hora seleccionada:', selectedTime);
    console.log(`Diferencia de tiempo: ${diferenciaMinutos} minutos`);

    if (diferenciaMinutos > 1) {
      console.warn('¡Advertencia! La hora seleccionada difiere significativamente de la hora global.');
    } else {
      console.log('Las horas coinciden dentro del rango permitido.');
    }

    // Navegar a la pantalla de confirmación si todo está correcto
    navigation.navigate('ConfirmacionScreen');
  } catch (error) {
    console.error('Error en handleEnviar:', error);
    Alert.alert('Error', 'Ocurrió un problema al procesar la información.');
  }
};




const obtenerHoraNTP = async () => {
  try {
    const response = await axios.get('http://timeapi.io/api/Time/current/zone?timeZone=UTC');
    console.log('Respuesta de la API:', response.data); // Imprimir la respuesta completa para verificar el formato

    // Usamos una propiedad diferente dependiendo de la respuesta
    const horaNTP = response.data.dateTime; // Verifica si esta propiedad existe en la respuesta

    // Asegúrate de que 'horaNTP' sea un valor válido
    if (!horaNTP) {
      throw new Error('No se pudo obtener la hora de la respuesta');
    }

    // Convertimos la hora en formato ISO a un objeto Date
    const horaNTPObj = new Date(horaNTP);
    console.log('Hora NTP:', horaNTPObj);

    // Si la hora NTP no es válida (NaN), lanzamos un error
    if (isNaN(horaNTPObj)) {
      throw new Error('La hora NTP es inválida');
    }

    // Llamamos a la función para comparar las horas
    const horaLocal = new Date();  // Hora local del dispositivo
    console.log('Hora local:', horaLocal);

    compararHoras(horaLocal, horaNTPObj); // Llamamos a la función compararHoras
  } catch (error) {
    console.error('Error al obtener la hora NTP:', error);
  }
};

// Función para comparar la hora local y la hora del servidor NTP
const compararHoras = (horaLocal, horaNTP) => {
  // Calculamos la diferencia entre las dos horas en milisegundos
  const diferenciaEnMs = Math.abs(horaLocal - horaNTP);  // Usamos Math.abs() para obtener el valor absoluto

  // Convertimos la diferencia de milisegundos a minutos
  const diferenciaEnMinutos = diferenciaEnMs / 1000 / 60; // Dividimos entre 1000 (segundos) y entre 60 (minutos)

  // Si la diferencia es mayor a 1 minuto, mostramos un mensaje
  if (diferenciaEnMinutos > 1) {
    console.warn('¡Advertencia! La hora local ha sido modificada.');
    console.log(`Hora local: ${horaLocal}`);
    console.log(`Hora NTP: ${horaNTP}`);
  } else {
    console.log('Las horas son consistentes');
  }
};
  // Manejo de la selección de hora de soporte
  const onTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
      setHoraSoporte(time.toLocaleTimeString('es-ES'));
    }
  };
  

  // Función para manejar el cambio de texto en el comentario
  const onChangeComentario = (text) => {
    if (text.length <= maxCaracteres) {
      setComentario(text);
      setMensajeLimite(false);
    } else {
      setMensajeLimite(true);
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Título y Descripción */}
      <Text style={tw`text-xl font-bold text-center mt-5 mb-1`}>Control de soporte técnico</Text>
      <Text style={tw`text-sm text-center text-gray-500 mb-5`}>Ingrese evidencias de cada soporte</Text>
  
      {/* Mapa independiente de ScrollView */}
      <View style={tw`h-60 w-full mb-5 px-5`}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <WebView
            ref={(ref) => { this.webviewRef = ref; }}
            style={tw`w-full h-full rounded-md`} // Se agregó `rounded-md` para un borde redondeado
            originWhitelist={['*']}
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Mapa</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
                  <style>
                    #map { height: 100vh; width: 100vw; border-radius: 8px; }
                    .leaflet-control-custom {
                      background-color: white;
                      border: 2px solid #ccc;
                      padding: 5px;
                      cursor: pointer;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    }
                  </style>
                </head>
                <body>
                  <div id="map"></div>
                  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
                  <script>
                    ${injectedJavaScript}
                  </script>
                </body>
                </html>
              `,
            }}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleMessage}
          />
        )}
      </View>
  
      {/* ScrollView para los elementos debajo del mapa */}
      <ScrollView contentContainerStyle={tw`px-5 pb-20`}>
        {/* Hora de Soporte */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-lg font-bold mb-2`}>Hora de soporte</Text>
            <TimeIcon width={24} height={24} />
          </View>
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <TextInput
              style={tw`border border-gray-300 rounded-md px-3 py-2 text-base`}
              placeholder="00:00:00"
              value={horaSoporte}
              editable={false}
            />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>
  
        {/* Subir Fotos */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-lg font-bold mb-2`}>Subir fotos</Text>
            <UploadIcon width={24} height={24} />
          </View>
          <View style={tw`flex-row justify-around mt-2`}>
            <TouchableOpacity style={tw`border border-gray-300 rounded-md py-2 px-4 bg-gray-100`} onPress={openCamera}>
              <Text style={tw`text-base text-gray-500`}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw`border border-gray-300 rounded-md py-2 px-4 bg-gray-100`} onPress={openGallery}>
              <Text style={tw`text-base text-gray-500`}>Seleccionar de galería</Text>
            </TouchableOpacity>
          </View>
  
          {/* Mostrar las imágenes seleccionadas */}
          {images.length > 0 && (
            <FlatList
              data={images}
              horizontal
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={tw`relative`}>
                  <Image source={{ uri: item }} style={tw`w-40 h-40 m-2`} />
                  <TouchableOpacity
                    style={tw`absolute top-0 right-0 bg-red-500 w-6 h-6 rounded-full items-center justify-center`}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={tw`text-white text-xs`}>X</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
  
        {/* Comentario */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Comentario</Text>
            <CommentIcon width={24} height={24} />
          </View>
          <TextInput
            style={tw`border border-gray-300 rounded-md px-3 py-2 text-base h-20`}
            placeholder="Establecer máximo de caracteres."
            value={comentario}
            onChangeText={onChangeComentario}
            multiline
          />
          {mensajeLimite && (
            <View style={tw`mt-2 bg-red-500 rounded p-1`}>
              <Text style={tw`text-white text-sm`}>Has alcanzado el número máximo de caracteres</Text>
            </View>
          )}
        </View>
      </ScrollView>
  
      {/* Botón de Terminar */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-5`}>
        <TouchableOpacity
          style={tw`bg-blue-900 py-3 rounded-full w-[140px] self-center`}
          onPress={handleEnviar}
        >
          <Text style={tw`text-white text-center text-base font-bold`}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
};

export default ControlSoporteScreen;