import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { StateType } from '../reducers';
import { nameCharacterSet, nameLength } from '../config';

const Home: React.FC = () => {
  const networkName = useSelector((state: StateType) => state.networkName);
  const connected = useSelector((state: StateType) => state.connected);
  const clientId = useSelector((state: StateType) => state.clientId);

  const history = useHistory();

  useEffect(() => {
    const currentNetworkName =
      networkName ||
      new Array(nameLength)
        .fill('')
        .map(() =>
          nameCharacterSet.charAt(
            Math.floor(Math.random() * nameCharacterSet.length)
          )
        )
        .join('');
    if (connected && clientId) {
      history.replace('/' + currentNetworkName);
    }
  }, [connected, networkName, history, clientId]);

  return <section className="center">Loading...</section>;
};

export default Home;
