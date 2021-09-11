import React from 'react';
import LanguageContext from '../context/LanguageContext';

class Button extends React.Component {
  static contextType = LanguageContext;

  render() {
    console.log(this.context);
    return <button className='ui violet button'>Submit</button>;
  }
}

export default Button;
