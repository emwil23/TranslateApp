import React, { useState } from 'react';
import UserCreate from './UserCreate';

const App = () => {
  const [state, setState] = useState(null);

  const onLanguageChnage = (Language) => {
    setState(Language);
  };

  return (
    <div className=' ui container '>
      <div>
        Select Language:
        <i className=' flag us' onClick={() => onLanguageChnage('english')}></i>
        <i className=' flag in' onClick={() => onLanguageChnage('hindi')}></i>
      </div>
      <UserCreate />
    </div>
  );
};

export default App;
