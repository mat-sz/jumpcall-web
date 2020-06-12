import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';

import { StateType } from '../reducers';
import QrCodeSection from '../components/QrCodeSection';
import TransfersSection from '../components/TransfersSection';
import IncompatibleBrowser from '../components/IncompatibleBrowser';
import WelcomeModal from '../modals/WelcomeModal';
import { setNetworkNameAction } from '../actions/state';

const Transfers: React.FC = () => {
  const dispatch = useDispatch();
  const welcomed = useSelector((state: StateType) => state.welcomed);
  const { networkName } = useParams<{ networkName: string }>();
  const [href, setHref] = useState('');
  const [incompatibleBrowser, setIncompatibleBrowser] = useState(false);

  useEffect(() => {
    setHref(
      window.location.origin + window.location.pathname + window.location.hash
    );
    dispatch(setNetworkNameAction(networkName));
  }, [setHref, networkName, dispatch]);

  useEffect(() => {
    setIncompatibleBrowser(
      !(
        'RTCPeerConnection' in window &&
        'WebSocket' in window &&
        'FileReader' in window
      )
    );
  }, []);

  return (
    <>
      {incompatibleBrowser ? <IncompatibleBrowser /> : null}
      <AnimatePresence>{!welcomed ? <WelcomeModal /> : null}</AnimatePresence>
      <section className="desktop-2col">
        <TransfersSection />
        <QrCodeSection href={href} />
      </section>
    </>
  );
};

export default Transfers;
