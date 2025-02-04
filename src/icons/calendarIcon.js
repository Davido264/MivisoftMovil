import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const CalendarIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <Path d="M19 3h-1V1h-2v2H8V1H6v2H5a2.002 2.002 0 00-2 2v14a2.002 2.002 0 002 2h14a2.002 2.002 0 002-2V5a2.002 2.002 0 00-2-2zM5 5h14v2H5zm0 14V9h14l.002 10z"/>
  </Svg>
);

export default CalendarIcon;
