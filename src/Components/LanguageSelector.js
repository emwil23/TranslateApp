import React from 'react';

class LanguageSelector extends React.Component {
  render() {
    return (
      <div>
        Select Language:
        <i
          className=' flag us'
          onClick={() => this.props.onLanguageChnage('english')}
        ></i>
        <i
          className=' flag in'
          onClick={() => this.props.onLanguageChnage('hindi')}
        ></i>
      </div>
    );
  }
}

export default LanguageSelector;
