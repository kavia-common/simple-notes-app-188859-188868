import React from 'react';
import './App.css';
import NotesLayout from './NotesLayout';

// PUBLIC_INTERFACE
function App() {
  /** Root component rendering the NotesLayout with style guide-friendly theme. */
  React.useEffect(() => {
    document.body.style.background = '#f9fafb';
    document.body.style.color = '#111827';
  }, []);
  return <NotesLayout />;
}

export default App;
