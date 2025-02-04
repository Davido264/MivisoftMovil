import React from 'react';
import { View, Text, Image } from 'react-native';
import tw from 'twrnc';

const LoadingScreen = () => {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Título */}
      <Text style={tw`text-2xl font-bold text-blue-900 mb-5`}>MIVILSOFT</Text>

      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')}  // Cambia la ruta de la imagen si es necesario
        style={tw`w-40 h-40 mb-5`}  // Ajusta el tamaño del logo
      />

      {/* Texto de Cargando */}
      <Text style={tw`text-lg font-bold text-gray-600`}>CARGANDO...</Text>
    </View>
  );
};

export default LoadingScreen;
