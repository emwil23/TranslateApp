import React, { useState } from 'react';
import UserCreate from './UserCreate';
import LanguageContext from '../context/LanguageContext';
import ColorContext from '../context/ColorContext';
import LanguageSelector from './LanguageSelector';

const App = () => {
  const [state, setState] = useState('english');

  const onLanguageChnage = (Language) => {
    setState(Language);
  };

  return (
    <div className=' ui container '>
      <LanguageSelector onLanguageChnage={onLanguageChnage} />
      <ColorContext.Provider value='red'>
        <LanguageContext.Provider value={state}>
          <UserCreate />
        </LanguageContext.Provider>
      </ColorContext.Provider>
    </div>
  );
};

export default App;
