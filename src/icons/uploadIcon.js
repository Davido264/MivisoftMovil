import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const UploadIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <Path d="M19 15v4H5v-4H3v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2zm-7-1l5-5h-3V3h-4v6H7l5 5z" />
  </Svg>
);

export default UploadIcon;
