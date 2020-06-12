import { put, takeEvery, select, call } from 'redux-saga/effects';
import { v4 as uuid } from 'uuid';

import {
  ActionModel,
  TransferModel,
  NameMessageModel,
  ActionMessageModel,
  PingMessageModel,
  Message,
} from '../types/Models';
import { ActionType } from '../types/ActionType';
import { StateType } from '../reducers';
import transferSendFile from './transferSendFile';
import transferReceiveFile from './transferReceiveFile';
import { TransferState } from '../types/TransferState';
import {
  setRemoteDescriptionAction,
  removeTransferAction,
  updateTransferAction,
  addTransferAction,
  addIceCandidateAction,
} from '../actions/calls';
import { sendMessageAction } from '../actions/websocket';
import {
  setNetworkAction,
  setRtcConfigurationAction,
  setClientIdAction,
  setConnectedAction,
} from '../actions/state';
import { MessageType, ActionMessageActionType } from '../types/MessageType';

function* message(action: ActionModel, dispatch: (action: any) => void) {
  const msg: Message = action.value as Message;

  switch (msg.type) {
    case MessageType.WELCOME:
      yield put(setRtcConfigurationAction(msg.rtcConfiguration));
      yield put(setClientIdAction(msg.clientId));
      break;
    case MessageType.CALL:
      // const transfer: TransferModel = {
      //   callId: msg.callId,
      //   clientId: msg.clientId,
      //   state: TransferState.INCOMING,
      //   receiving: true,
      // };

      // yield put(addTransferAction(transfer));
      break;
    case MessageType.ACTION:
      switch (msg.action) {
        case ActionMessageActionType.CANCEL:
        case ActionMessageActionType.REJECT:
          yield put(removeTransferAction(msg.callId));
          break;
        case ActionMessageActionType.ACCEPT:
          yield call(() => transferSendFile(msg, dispatch));
          break;
      }
      break;
    case MessageType.NETWORK:
      yield put(setNetworkAction(msg.clients));
      break;
    case MessageType.PING:
      const pongMessage: PingMessageModel = {
        type: MessageType.PING,
        timestamp: new Date().getTime(),
      };
      yield put(sendMessageAction(pongMessage));
      break;
    case MessageType.RTC_DESCRIPTION:
      if (msg.data.type === 'answer') {
        yield put(setRemoteDescriptionAction(msg.callId, msg.data));
      } else {
        yield call(() => transferReceiveFile(msg, dispatch));
      }
      break;
    case MessageType.RTC_CANDIDATE:
      yield put(addIceCandidateAction(msg.callId, msg.data));
      break;
  }
}

function* connected() {
  yield put(setConnectedAction(true));

  let networkName = yield select((state: StateType) => state.networkName);
  if (networkName && networkName !== '') {
    const message: NameMessageModel = {
      type: MessageType.NAME,
      networkName: networkName,
    };

    yield put(sendMessageAction(message));
  }
}

function* setName(action: ActionModel) {
  const message: NameMessageModel = {
    type: MessageType.NAME,
    networkName: action.value,
  };

  yield put(sendMessageAction(message));
}

function* disconnected() {
  yield put(setConnectedAction(false));
}

function* createTransfer(action: ActionModel) {
  const file: File = action.value.file;

  const transfer: TransferModel = {
    file: file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream', // fileType is required by the server.
    callId: uuid(),
    clientId: action.value.clientId,
    state: TransferState.OUTGOING,
    receiving: false,
  };

  yield put(addTransferAction(transfer));

  // const model: TransferMessageModel = {
  //   type: MessageType.TRANSFER,
  //   callId: transfer.callId,
  //   fileName: transfer.fileName,
  //   fileSize: transfer.fileSize,
  //   fileType: transfer.fileType,
  //   targetId: transfer.clientId,
  // };

  // yield put(sendMessageAction(model));
}

function* cancelTransfer(action: ActionModel) {
  const transfers: TransferModel[] = yield select(
    (state: StateType) => state.transfers
  );
  const filteredTransfers: TransferModel[] = transfers.filter(
    transfer => transfer.callId === action.value
  );
  if (filteredTransfers.length === 0) return;

  const transfer = filteredTransfers[0];
  if (!transfer) return;

  if (transfer.peerConnection) {
    try {
      transfer.peerConnection.close();
    } catch {}
  }

  const model: ActionMessageModel = {
    type: MessageType.ACTION,
    callId: transfer.callId,
    targetId: transfer.clientId,
    action: ActionMessageActionType.CANCEL,
  };

  yield put(sendMessageAction(model));
  yield put(removeTransferAction(action.value));
}

function* acceptTransfer(action: ActionModel) {
  const transfers: TransferModel[] = yield select(
    (state: StateType) => state.transfers
  );
  const filteredTransfers: TransferModel[] = transfers.filter(
    transfer =>
      transfer.state === TransferState.INCOMING &&
      transfer.callId === action.value
  );
  if (filteredTransfers.length === 0) return;

  const transfer = filteredTransfers[0];
  if (!transfer) return;

  const model: ActionMessageModel = {
    type: MessageType.ACTION,
    callId: transfer.callId,
    targetId: transfer.clientId,
    action: ActionMessageActionType.ACCEPT,
  };

  yield put(sendMessageAction(model));
  yield put(
    updateTransferAction({
      callId: action.value,
      state: TransferState.CONNECTING,
    })
  );
}

function* rejectTransfer(action: ActionModel) {
  const transfers: TransferModel[] = yield select(
    (state: StateType) => state.transfers
  );
  const filteredTransfers: TransferModel[] = transfers.filter(
    transfer =>
      transfer.state === TransferState.INCOMING &&
      transfer.callId === action.value
  );
  if (filteredTransfers.length === 0) return;

  const transfer = filteredTransfers[0];
  if (!transfer) return;

  const model: ActionMessageModel = {
    type: MessageType.ACTION,
    callId: transfer.callId,
    targetId: transfer.clientId,
    action: ActionMessageActionType.REJECT,
  };

  yield put(sendMessageAction(model));
  yield put(removeTransferAction(action.value));
}

/**
 * Called after the welcome screen is dismissed.
 */
function* welcomed() {
  yield call(() => localStorage.setItem('welcomed', '1'));
}

function* updateNotificationCount() {
  const transfers: TransferModel[] = yield select(
    (state: StateType) => state.transfers
  );
  const incomingTransfers: TransferModel[] = transfers.filter(
    transfer => transfer.state === TransferState.INCOMING
  );

  if (incomingTransfers.length > 0) {
    document.title =
      '(' + incomingTransfers.length + ') ' + process.env.REACT_APP_TITLE;
  } else {
    document.title = process.env.REACT_APP_TITLE;
  }
}

export default function* root(dispatch: (action: any) => void) {
  yield takeEvery(ActionType.DISMISS_WELCOME, welcomed);

  yield takeEvery(ActionType.WS_MESSAGE, function* (action: ActionModel) {
    // TODO: rewrite this to avoid passing dispatch
    yield call(() => message(action, dispatch));
  });
  yield takeEvery(ActionType.WS_CONNECTED, connected);
  yield takeEvery(ActionType.WS_DISCONNECTED, disconnected);

  yield takeEvery(ActionType.SET_NETWORK_NAME, setName);

  yield takeEvery(ActionType.CREATE_TRANSFER, createTransfer);
  yield takeEvery(ActionType.CANCEL_TRANSFER, cancelTransfer);

  yield takeEvery(ActionType.ACCEPT_TRANSFER, acceptTransfer);
  yield takeEvery(ActionType.REJECT_TRANSFER, rejectTransfer);

  yield takeEvery(
    [
      ActionType.ADD_TRANSFER,
      ActionType.UPDATE_TRANSFER,
      ActionType.REMOVE_TRANSFER,
      ActionType.SET_NETWORK,
    ],
    updateNotificationCount
  );
}
