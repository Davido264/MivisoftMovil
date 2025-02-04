import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc'; // Importa la configuración de tailwind con twrnc

const FallaInternet = () => {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')} // Reemplaza con la ruta correcta de tu logo
        style={tw`w-40 h-40 mb-5`} // Tamaño del logo
      />
      <Text style={tw`text-2xl font-bold text-center text-blue-900 mb-5`}>MIVILSOFT</Text>

      {/* Caja de Falla de Internet */}
      <View style={tw`w-4/5 p-5 border border-gray-300 rounded-md mb-8`}>
        <Image
          source={require('../../assets/internet-error.png')} // Reemplaza con el icono de error de conexión
          style={tw`w-12 h-12 mx-auto mb-3`} // Tamaño del icono
          resizeMode="contain"
        />
        <Text style={tw`text-center text-lg font-semibold text-gray-700`}>Fallo en la conexión a internet</Text>
      </View>

      {/* Mensaje de Cargando */}
      <Text style={tw`text-lg font-semibold text-gray-700 mt-5`}>CARGANDO...</Text>
    </View>
  );
};

export default FallaInternet;
