import React from 'react';
import Svg, { Path } from 'react-native-svg';

const LocationIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={props.width} height={props.height} fill={props.fill || "black"}>
    <Path d="M12 2C8.14 2 5 5.14 5 9c0 4.27 5.07 11.28 6.39 13.07a1 1 0 0 0 1.62 0C13.93 20.28 19 13.27 19 9c0-3.86-3.14-7-7-7zm0 18.44C10.51 18.16 7 12.5 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 3.5-3.51 9.16-5 11.44zM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
    <Path d="M12 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </Svg>
);

export default LocationIcon;
