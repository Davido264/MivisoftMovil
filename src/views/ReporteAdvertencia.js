import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc'; // Importa la configuración de tailwind con twrnc

const ReporteAdvertencia = ({ navigation }) => {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')} // Reemplaza con la ruta correcta de tu logo
        style={tw`w-40 h-40 mb-5`} // Tamaño del logo
      />
      <Text style={tw`text-2xl font-bold text-center text-blue-900 mb-5`}>MIVILSOFT</Text>

      {/* Caja de Advertencia */}
      <View style={tw`w-4/5 p-5 border border-gray-300 rounded-md mb-8`}>
        <Image
          source={require('../../assets/warning.png')} // Reemplaza con el icono de advertencia
          style={tw`w-8 h-8 mx-auto mb-3`} // Tamaño del icono
          resizeMode="contain" 
        />
        <Text style={tw`text-center text-lg font-semibold text-gray-700`}>Trabajo incompleto o incorrecto</Text>
      </View>

      {/* Botón para regresar al menú principal */}
      <TouchableOpacity
        style={tw`bg-blue-500 py-3 px-5 rounded-md`}
        onPress={() => navigation.navigate('Dashboard')} // Navega de regreso al menú principal
      >
        <Text style={tw`text-white text-center text-lg`}>Regresar al menú </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ReporteAdvertencia;
