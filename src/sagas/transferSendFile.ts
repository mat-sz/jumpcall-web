import { put, select } from 'redux-saga/effects';

import {
  TransferModel,
  ActionMessageModel,
  RTCDescriptionMessageModel,
  RTCCandidateMessageModel,
} from '../types/Models';
import { StateType } from '../reducers';
import { TransferState } from '../types/TransferState';
import { updateTransferAction } from '../actions/calls';
import { sendMessageAction } from '../actions/websocket';
import { MessageType } from '../types/MessageType';

export default function* transferSendFile(
  actionMessage: ActionMessageModel,
  dispatch: (action: any) => void
) {
  yield put(
    updateTransferAction({
      callId: actionMessage.callId,
      state: TransferState.CONNECTING,
    })
  );

  const transfers: TransferModel[] = yield select(
    (state: StateType) => state.transfers
  );
  const filteredTransfers: TransferModel[] = transfers.filter(
    transfer => transfer.callId === actionMessage.callId
  );
  if (filteredTransfers.length === 0) return;

  const transfer = filteredTransfers[0];
  if (!transfer || !transfer.file) return;

  const file = transfer.file;

  const rtcConfiguration = yield select(
    (state: StateType) => state.rtcConfiguration
  );
  const connection = new RTCPeerConnection(rtcConfiguration);

  yield put(
    updateTransferAction({
      callId: transfer.callId,
      peerConnection: connection,
    })
  );

  connection.addEventListener('negotiationneeded', async () => {
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    const nextRtcMessage: RTCDescriptionMessageModel = {
      type: MessageType.RTC_DESCRIPTION,
      callId: transfer.callId,
      targetId: transfer.clientId,
      data: {
        type: connection.localDescription.type,
        sdp: connection.localDescription.sdp,
      },
    };

    dispatch(sendMessageAction(nextRtcMessage));
  });

  connection.addEventListener('icecandidate', e => {
    if (!e || !e.candidate) return;

    const candidateMessage: RTCCandidateMessageModel = {
      type: MessageType.RTC_CANDIDATE,
      targetId: transfer.clientId,
      callId: transfer.callId,
      data: e.candidate,
    };

    dispatch(sendMessageAction(candidateMessage));
  });

  const channel = connection.createDataChannel('sendDataChannel');
  channel.binaryType = 'arraybuffer';

  const timestamp = new Date().getTime() / 1000;

  let complete = false;
  const onFailure = () => {
    complete = true;

    dispatch(
      updateTransferAction({
        callId: transfer.callId,
        state: TransferState.FAILED,
        progress: 1,
        speed: 0,
      })
    );
  };

  const bufferSupported = !!connection.sctp;
  const bufferSize = bufferSupported ? connection.sctp.maxMessageSize : 16384;

  channel.addEventListener('open', () => {
    dispatch(
      updateTransferAction({
        callId: transfer.callId,
        state: TransferState.CONNECTED,
      })
    );

    const fileReader = new FileReader();
    let offset = 0;

    const nextSlice = (currentOffset: number) => {
      const slice = file.slice(offset, currentOffset + bufferSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.addEventListener('load', e => {
      if (complete) return;

      const buffer = e.target.result as ArrayBuffer;

      try {
        channel.send(buffer);
      } catch {
        onFailure();
        channel.close();
        return;
      }

      offset += buffer.byteLength;

      dispatch(
        updateTransferAction({
          callId: transfer.callId,
          state: TransferState.IN_PROGRESS,
          progress: offset / file.size,
          speed: offset / (new Date().getTime() / 1000 - timestamp),
        })
      );

      if (offset >= file.size) {
        dispatch(
          updateTransferAction({
            callId: transfer.callId,
            state: TransferState.COMPLETE,
            progress: 1,
            speed: 0,
            time: Math.floor(new Date().getTime() / 1000 - timestamp),
          })
        );

        complete = true;
        // Uncomment the next line if there are issues with transfers getting stuck at 100%.
        // channel.close();
      } else if (!bufferSupported) {
        nextSlice(offset);
      }
    });

    if (bufferSupported) {
      channel.bufferedAmountLowThreshold = 0;
      channel.addEventListener('bufferedamountlow', () => nextSlice(offset));
    }

    nextSlice(0);
  });

  channel.addEventListener('close', () => {
    if (!complete) {
      onFailure();
    }

    connection.close();
  });

  connection.addEventListener('iceconnectionstatechange', () => {
    if (
      (connection.iceConnectionState === 'failed' ||
        connection.iceConnectionState === 'disconnected') &&
      !complete
    ) {
      onFailure();
    }
  });
}
