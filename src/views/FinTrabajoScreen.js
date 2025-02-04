import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, PermissionsAndroid } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import { launchCamera } from 'react-native-image-picker';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';
import CalendarIcon from '../icons/calendarIcon'; // Importando ícono de calendario
import TimeIcon from '../icons/timeIcon'; // Importando ícono de reloj
import UploadIcon from '../icons/uploadIcon'; // Importando ícono de subida
import CommentIcon from '../icons/commentIcon'; // Importando ícono de comentario
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FinTrabajoScreen = () => {
  const navigation = useNavigation();
  const viewShotRef = useRef();

  const [fecha, setFecha] = useState('');
  const [horaFinalizacion, setHoraFinalizacion] = useState('');
  const [comentario, setComentario] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [imageUri, setImageUri] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [mensajeLimite, setMensajeLimite] = useState(false);
  const horaFinalizacionObj = selectedTime; // Hora de finalización seleccionada
  const [isConnected, setIsConnected] = useState(true);
  const [conexionPerdida, setConexionPerdida] = useState(false);
  const [horaIngresada, setHoraIngresada] = useState(''); // Nuevo estado para la hora ingresada por teclado
  const [lastConnectionState, setLastConnectionState] = useState(null);
  const [datosGuardadosEnCache, setDatosGuardadosEnCache] = useState(false);
  const [conectadoAnteriormente, setConectadoAnteriormente] = useState(true);




  const maxCaracteres = 200;

  const obtenerFechaActual = () => new Date().toLocaleDateString('es-ES');
  const obtenerHoraActual = () =>
    new Date().toLocaleTimeString('es-ES', { hour12: false });

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
          console.log('Detectada pérdida de conexión');
          guardarDatosEnCache();
          setDatosGuardadosEnCache(true);
          setConectadoAnteriormente(false);
        } else if (state.isConnected && !conectadoAnteriormente) {
          console.log('Conexión restablecida');
          enviarDatosGuardados();
          setDatosGuardadosEnCache(false);
          setConectadoAnteriormente(true);
        }
        setLastConnectionState(state.isConnected);
      }
    });

    setFecha(obtenerFechaActual());
    setHoraFinalizacion(obtenerHoraActual());
    obtenerUbicacion();
    obtenerHoraNTP(); // Llamamos a la función para verificar la hora NTP
    monitorConexión();

    return () => unsubscribe();
  }, [lastConnectionState, conectadoAnteriormente]);

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




  const monitorConexión = () => {
    NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        if (!conexionPerdida) {
          Alert.alert('Conexión perdida', 'No hay conexión a Internet. Los datos se guardarán localmente.');
          setConexionPerdida(true);
        }
        setIsConnected(false);
      } else if (conexionPerdida && state.isConnected) {
        Alert.alert('Conexión recuperada', 'La conexión se ha restablecido. Sincronizando formularios guardados...');
        enviarFormulariosGuardados();
        setConexionPerdida(false);
        setIsConnected(true);
      }
    });
  };

  const guardarDatosEnCache = async () => {
    console.log('Intentando guardar en caché tras pérdida de conexión');
  
    const datos = {
      fecha: fecha || '',
      horaFinalizacion: horaFinalizacion || '',
      comentario: comentario || '',
      ubicacion: ubicacion || null,
      imageUri: imageUri || null,
    };
  
    try {
      await AsyncStorage.setItem('@datos_fin_trabajo', JSON.stringify(datos));
      console.log('Datos guardados en caché con éxito:', datos);
    } catch (error) {
      console.error('Error al guardar en caché:', error);
    }
  };

  const camposCompletos = () => {
    return (
      fecha &&
      horaFinalizacion &&
      comentario &&
      imageUri &&
      comentario.length > 0 // Asegúrate de que el comentario no esté vacío
    );
  };



  const enviarFormulariosGuardados = async () => {
    try {
      const formulariosGuardados = JSON.parse(await AsyncStorage.getItem('formulariosOffline')) || [];
      if (formulariosGuardados.length > 0) {
        for (const form of formulariosGuardados) {
          await axios.post('https://tu-servidor.com/api/formulario', form);
        }
        await AsyncStorage.removeItem('formulariosOffline');
        Alert.alert('Sincronización exitosa', 'Todos los formularios guardados se han enviado correctamente.');
      }
    } catch (error) {
      console.error('Error al sincronizar formularios guardados:', error);
    }
  };


  // Función para comparar la hora local y la hora del servidor NTP
  const compararHoras = (horaLocal, horaNTP) => {
    if (!horaLocal || !horaNTP) {
      console.error("Una de las horas no está definida");
      return;
    }
    // Calculamos la diferencia entre las dos horas en milisegundos
    const diferenciaEnMs = Math.abs(horaLocal - horaNTP);

    // Convertimos la diferencia de milisegundos a minutos
    const diferenciaEnMinutos = diferenciaEnMs / 1000 / 60;

    // Si la diferencia es mayor a 1 minuto, mostramos un mensaje
    if (diferenciaEnMinutos > 1) {
      console.warn('¡Advertencia! La hora local ha sido modificada.');
      console.log(`Hora local: ${horaLocal}`);
      console.log(`Hora NTP: ${horaNTP}`);
    } else {
      console.log('Las horas son consistentes');
    }
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
      // Obtener la hora global NTP
      const response = await axios.get('http://timeapi.io/api/Time/current/zone?timeZone=UTC');
      const horaNTP = new Date(response.data.dateTime);

      if (isNaN(horaNTP)) {
        throw new Error('La hora NTP obtenida es inválida.');
      }

      const normalizarHora = (date) => {
        const nuevaHora = new Date(date);
        nuevaHora.setSeconds(0, 0); // Establecer segundos y milisegundos en 0
        return nuevaHora;
      };

      const horaFinalizacionNormalizada = normalizarHora(selectedTime); // Usa el estado actualizado
      const horaNTPNormalizada = normalizarHora(horaNTP);

      // Calcular diferencia en minutos
      const diferenciaEnMs = Math.abs(horaFinalizacionNormalizada - horaNTPNormalizada);
      const diferenciaEnMinutos = (diferenciaEnMs / 1000 / 60).toFixed(2);

      console.log('Hora NTP:', horaNTPNormalizada);
      console.log('Hora de Finalización:', horaFinalizacionNormalizada);
      console.log(`Diferencia en minutos: ${diferenciaEnMinutos}`);

      if (diferenciaEnMinutos > 1) {
        console.warn('¡Discrepancia detectada! La hora de finalización difiere de la hora global.');
      } else {
        console.log('Las horas coinciden dentro del rango aceptable.');
      }
      navigation.navigate('ConfirmacionScreen');
    } catch (error) {
      console.error('Error al obtener la hora NTP:', error);
      Alert.alert('Error', 'Ocurrió un problema al procesar la comparación de horas.');
    }
  };


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

  const requestPermissions = async () => {
    const cameraPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    const locationPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return cameraPermission === PermissionsAndroid.RESULTS.GRANTED && locationPermission === PermissionsAndroid.RESULTS.GRANTED;
  };

  const openCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permiso denegado', 'No tienes permiso para acceder a la cámara.');
      return;
    }
  
    const options = { mediaType: 'photo', saveToPhotos: true, quality: 1 };
  
    launchCamera(options, async (response) => {
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setImageUri(uri);
  
        // Guardar la imagen automáticamente después de tomar la foto
        setTimeout(async () => {
          await captureViewAndSave();  // Guardar con filtro
        }, 500);
      }
    });
  };
  


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
      guardarDatosEnCache();  // Guardado automático
    } else {
      setMensajeLimite(true);
    }
  };
  

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFecha(selectedDate.toLocaleDateString('es-ES'));
      guardarDatosEnCache();
    }
  };
  
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
      setHoraFinalizacion(selectedTime.toLocaleTimeString('es-ES', { hour12: false }));
      guardarDatosEnCache();
    }
  };
  

  return (
    <View style={tw`flex-1 bg-white`}>
      <ScrollView contentContainerStyle={tw`p-5 pb-20`}>
        <Text style={tw`text-xl font-bold text-center mb-3`}>Formulario de seguimiento</Text>
        <Text style={tw`text-base text-center text-gray-500 mb-6`}>Complete todos los campos</Text>

        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Fecha</Text>
            <CalendarIcon width={24} height={24} />
          </View>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              style={tw`border border-gray-300 rounded-md px-3 py-2 text-base`}
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

        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Hora de finalización</Text>
            <TimeIcon width={24} height={24} />
          </View>
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <TextInput
              style={tw`border border-gray-300 rounded-md px-3 py-2 text-base`}
              value={horaFinalizacion}
              editable={false}
            />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour
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
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Hora: {horaFinalizacion}</Text>
                {ubicacion && (
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    Lat: {ubicacion.latitude.toFixed(6)}, Long: {ubicacion.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            </ViewShot>
          )}
        </View>

        <View style={tw`mb-5 pb-2 border-b border-gray-200`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base font-bold mb-1`}>Comentario</Text>
            <CommentIcon width={24} height={24} />
          </View>
          <TextInput
            style={tw`border border-gray-300 rounded-md px-3 py-2 text-base h-20`}
            placeholder="Escribe un comentario..."
            value={comentario}
            onChangeText={onChangeComentario}
            multiline
          />
          {mensajeLimite && (
            <View style={tw`mt-2 bg-red-500 rounded p-1`}>
              <Text style={tw`text-white text-sm`}>
                Máximo de caracteres alcanzado.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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

export default FinTrabajoScreen;
