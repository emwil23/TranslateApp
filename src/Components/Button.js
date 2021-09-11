import React from 'react';
import LanguageContext from '../context/LanguageContext';
import ColorContext from '../context/ColorContext';

class Button extends React.Component {
  renderSubmit(value) {
    return value === 'english' ? 'Submit' : 'Bhejo';
  }

  render() {
    return (
      <ColorContext.Consumer>
        {(color) => (
          <button className={`ui ${color} button`}>
            <LanguageContext.Consumer>
              {(value) => this.renderSubmit(value)}
            </LanguageContext.Consumer>
          </button>
        )}
      </ColorContext.Consumer>
    );
  }
}

export default Button;
