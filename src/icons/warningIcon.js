import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const WarningIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <Path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </Svg>
);

export default WarningIcon;
