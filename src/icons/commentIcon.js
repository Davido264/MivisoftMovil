import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const CommentIcon = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <Path d="M20 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM4 4h16v12h-4.586L12 20.586 8.586 16H4V4z" />
  </Svg>
);

export default CommentIcon;
