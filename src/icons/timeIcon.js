import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const TimeIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <Path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 20c-4.963 0-9-4.037-9-9s4.037-9 9-9 9 4.037 9 9-4.037 9-9 9zm-.5-9h-4v2h6V6h-2v6z"/>
  </Svg>
);

export default TimeIcon;
