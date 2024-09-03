import React from 'react';
import Broadcaster from './components/Broadcaster';
import Viewer from './components/Viewer';

function App() {
  const [isBroadcaster, setIsBroadcaster] = React.useState(false);

  return (
    <div>
      <button onClick={() => setIsBroadcaster(!isBroadcaster)}>
        {isBroadcaster ? 'Stop Broadcasting' : 'Start Broadcasting'}
      </button>
      {isBroadcaster ? <Broadcaster /> : <Viewer />}
    </div>
  );
}

export default App;
