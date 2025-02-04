import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc';

const UsuarioAdvertencia = ({ navigation }) => {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')}
        style={tw`w-30 h-30 mb-5`}
      />
      <Text style={tw`text-2xl font-bold text-blue-900 mb-8`}>MIVILSOFT</Text>

      {/* Caja de Advertencia */}
      <View style={tw`w-4/5 p-6 rounded-lg border border-gray-400 items-center bg-white`}>
        <Image
          source={require('../../assets/warning.png')}
          style={tw`w-8 h-8 mb-5`} 
          resizeMode="contain" 
        />
        <Text style={tw`text-lg font-bold text-gray-600 text-center mb-3`}>
          Usuario o contraseña incorrecta
        </Text>

        {/* Botón para regresar al inicio */}
        <TouchableOpacity
          style={tw`bg-[#00a8e8] py-3 px-6 rounded-full`}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={tw`text-white text-base font-bold`}>Regresar al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UsuarioAdvertencia;
