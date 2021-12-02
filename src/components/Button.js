import React, { useState } from 'react';
import './index.css';

function Button() {
  const [state, setState] = useState('CLICK ME');

  return <div>
    <button onClick={() => setState('CLICKED')}>{state}</button>
  </div>;
}

export default Button;
