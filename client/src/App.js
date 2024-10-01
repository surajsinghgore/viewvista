// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Broadcast from './Broadcast';
import Viewer from './Viewer';
import PublicStreams from './PublicStreams';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/view" element={<Viewer />} />
        <Route path="/public" element={<PublicStreams />} />
        <Route path="/" element={<h1>Welcome! Navigate to /broadcast or /view</h1>} />
      </Routes>
    </Router>
  );
};

export default App;
