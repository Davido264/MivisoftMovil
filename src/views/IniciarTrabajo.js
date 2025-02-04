import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, PermissionsAndroid } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import CalendarIcon from '../icons/calendarIcon';
import TimeIcon from '../icons/timeIcon';
import UploadIcon from '../icons/uploadIcon';
import CommentIcon from '../icons/commentIcon';
import { launchCamera } from 'react-native-image-picker';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Añadido para obtener hora NTP



const IniciarTrabajo = () => {
  const navigation = useNavigation();
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [comentario, setComentario] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [imageUri, setImageUri] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const viewShotRef = useRef(); // Referencia para ViewShot
  const [mensajeLimite, setMensajeLimite] = useState(false);
  const [id, setId] = useState('');
  const [lastConnectionState, setLastConnectionState] = useState(null);
  const [datosGuardadosEnCache, setDatosGuardadosEnCache] = useState(false);
  const [conectadoAnteriormente, setConectadoAnteriormente] = useState(true); 

  const maxCaracteres = 200;

  // Función para obtener la fecha actual formateada
  const obtenerFechaActual = () => {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-ES');
  };

  // Manejo de la selección de fecha
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setFecha(currentDate.toLocaleDateString('es-ES'));
  };

  // Manejo de la selección de hora
  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || new Date();
    setShowTimePicker(Platform.OS === 'ios');
    setSelectedTime(currentTime);
    setHoraInicio(currentTime.toLocaleTimeString('es-ES'));
  };

  // Función para generar un ID alfanumérico único
  const generarIdAlfanumerico = () => {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  };

  // Función para obtener la hora actual formateada
  const obtenerHoraActual = () => {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', { hour12: false });
  };

  useEffect(() => {
    const inicializarEstadoConexion = async () => {
      const estadoInicial = await NetInfo.fetch();
      setLastConnectionState(estadoInicial.isConnected);
      setConectadoAnteriormente(estadoInicial.isConnected);
    };
    inicializarEstadoConexion();
  
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected !== lastConnectionState) {
        if (!state.isConnected && conectadoAnteriormente) { 
          console.log('Detectada pérdida de conexión'); // Mensaje de verificación
          guardarDatosEnCache();
          setDatosGuardadosEnCache(true);
          setConectadoAnteriormente(false); // Cambia a desconectado
        } else if (state.isConnected && !conectadoAnteriormente) {
          console.log('Conexión restablecida');
          enviarDatosGuardados();
          setDatosGuardadosEnCache(false);
          setConectadoAnteriormente(true); // Cambia a conectado
        }
        setLastConnectionState(state.isConnected);
      }
    });

    setFecha(obtenerFechaActual());
    setHoraInicio(obtenerHoraActual());
    obtenerUbicacion();
    obtenerHoraNTP(); // Llamamos a la función para verificar la hora NTP
  
    return () => unsubscribe();
  }, [lastConnectionState, conectadoAnteriormente]);
  

  // Función para guardar los datos en caché usando AsyncStorage
  const guardarDatosEnCache = async () => {
    console.log('Intentando guardar en caché tras pérdida de conexión'); // Confirmación de llamada
  
    const datos = {
      fecha: fecha || '',
      horaInicio: horaInicio || '',
      comentario: comentario || '',
      ubicacion: ubicacion || null,
      imageUri: imageUri || null,
    };
  
    try {
      await AsyncStorage.setItem('@datos_formulario', JSON.stringify(datos));
      console.log('Datos guardados en caché con éxito:', datos); // Confirmación de éxito
    } catch (error) {
      console.error('Error al guardar en caché:', error);
    }
  };
  
  

  // Función para enviar los datos guardados en caché
  const enviarDatosGuardados = async () => {
    try {
      const datosEnCache = await AsyncStorage.getItem('@datos_formulario');
      if (datosEnCache !== null) {
        const datos = JSON.parse(datosEnCache);

        // Aquí enviarías los datos a tu servidor o procesarlos como necesites
        console.log('Enviando datos guardados:', datos);

        // Una vez enviados, eliminar del caché
        await AsyncStorage.removeItem('@datos_formulario');
      }
    } catch (error) {
      console.error('Error al enviar datos guardados:', error);
    }
  };

  const camposCompletos = () => {
    return (
      fecha &&
      horaInicio &&
      comentario &&
      imageUri &&
      comentario.length > 0 // Asegúrate de que el comentario no esté vacío
    );
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
      const response = await axios.get('http://timeapi.io/api/Time/current/zone?timeZone=UTC');
      const horaNTP = new Date(response.data.dateTime); // Convertir la respuesta a objeto Date
      const horaSeleccionada = selectedTime; // Hora seleccionada por el usuario
  
      const diferenciaMs = Math.abs(horaSeleccionada - horaNTP);
      const diferenciaMinutos = diferenciaMs / 1000 / 60;
  
      console.log('Hora NTP:', horaNTP);
      console.log('Hora seleccionada por el usuario:', horaSeleccionada);
      console.log(`Diferencia en minutos: ${diferenciaMinutos}`);
  
      if (diferenciaMinutos > 1) {
        console.warn('¡Discrepancia detectada! La hora difiere de la hora global.');
      } else {
        console.log('Las horas coinciden.');
      }
  
      navigation.navigate('ConfirmacionIdScreen', { horaInicio, id });
    } catch (error) {
      console.error('Error al obtener hora NTP:', error);
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

  // Solicitar permisos de cámara y ubicación en tiempo de ejecución
  const requestPermissions = async () => {
    const cameraPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    const locationPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return cameraPermission === PermissionsAndroid.RESULTS.GRANTED && locationPermission === PermissionsAndroid.RESULTS.GRANTED;
  };

  // Obtener la ubicación actual
  const obtenerUbicacion = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setUbicacion({ latitude, longitude });
      },
      error => {
        Alert.alert('Error al obtener ubicación', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Función para abrir la cámara y capturar la foto
  const openCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permiso denegado', 'No tienes permiso para acceder a la cámara o ubicación.');
      return;
    }

    const options = {
      mediaType: 'photo',
      saveToPhotos: true,
      quality: 1,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) {
        Alert.alert('Cancelado', 'No se tomó ninguna foto.');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setImageUri(uri);

        // Guardar la imagen automáticamente después de tomar la foto
        setTimeout(async () => {
          await captureViewAndSave(); // Capturar la imagen con el texto superpuesto y guardar
        }, 500); // Un pequeño retraso antes de capturar
      }
    });
  };

  // Función para capturar la vista y guardar la imagen
  const captureViewAndSave = async () => {
    try {
      const uri = await viewShotRef.current.capture(); // Capturar la vista con el texto superpuesto
      const fileName = `captured_image_${Date.now()}.jpg`;
      const newFilePath = `${RNFS.PicturesDirectoryPath}/${fileName}`; // Guardar en la carpeta de imágenes en Android

      // Mover el archivo capturado a la carpeta de imágenes
      await RNFS.moveFile(uri, newFilePath);

      Alert.alert('Éxito', `Imagen guardada en: ${newFilePath}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la imagen');
      console.error(error);
    }
  };

  const onChangeComentario = (text) => {
    if (text.length <= maxCaracteres) {
      setComentario(text);
      setMensajeLimite(false);
      guardarDatosEnCache(); // Guardar en el caché cada vez que cambia el comentario
    } else {
      setMensajeLimite(true);
    }
  };
  

  return (
    <View style={tw`flex-1 bg-white`}>
      <ScrollView contentContainerStyle={tw`p-5 pb-20`}>
        <Text style={tw`text-xl font-bold text-center mb-3`}>Formulario de seguimiento</Text>
        <Text style={tw`text-base text-center text-gray-500 mb-6`}>Complete todos los campos</Text>

        {/* Campo de Fecha */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Fecha</Text>
            <CalendarIcon width={24} height={24} />
          </View>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              style={tw`border border-gray-300 rounded-md px-3 py-2 text-base`}
              placeholder="dd/mm/yyyy"
              value={fecha}
              editable={false}
            />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Campo de Hora de Inicio */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Hora de inicio</Text>
            <TimeIcon width={24} height={24} />
          </View>
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <TextInput
              style={tw`border border-gray-300 rounded-md px-3 py-2 text-base`}
              placeholder="00:00:00"
              value={horaInicio}
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

        {/* Subir Foto */}
        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Subir foto</Text>
            <UploadIcon width={24} height={24} />
          </View>

          {/* Botón "Tomar foto" centrado */}
          <View style={tw`flex-row justify-center mt-2`}>
            <TouchableOpacity style={tw`border border-gray-200 rounded-md py-4 bg-gray-100 w-full items-center`} onPress={openCamera}>
              <Text style={tw`text-base text-gray-500`}>Tomar foto</Text>
            </TouchableOpacity>
          </View>

          {/* Imagen capturada con el filtro en el centro */}
          {imageUri && (
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={tw`w-full h-48 mt-4 relative`}>
              <Image source={{ uri: imageUri }} style={tw`w-full h-full rounded-md`} />
              <TouchableOpacity
                style={tw`absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center`}
                onPress={() => setImageUri(null)} // Eliminar la imagen
              >
                <Text style={tw`text-white text-xs`}>X</Text>
              </TouchableOpacity>
              {/* Texto superpuesto sobre la imagen */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 5 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Fecha: {fecha}</Text>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Hora: {horaInicio}</Text>
                {ubicacion && (
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    Lat: {ubicacion.latitude.toFixed(6)}, Long: {ubicacion.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            </ViewShot>
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

      {/* Botón de Enviar */}
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

export default IniciarTrabajo;
