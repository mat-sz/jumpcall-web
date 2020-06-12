import {
  ActionModel,
  TransferModel,
  TransferUpdateModel,
} from '../types/Models';
import { ActionType } from '../types/ActionType';

export function addTransferAction(transfer: TransferModel): ActionModel {
  return {
    type: ActionType.ADD_TRANSFER,
    value: transfer,
  };
}

export function updateTransferAction(
  transferUpdate: TransferUpdateModel
): ActionModel {
  return {
    type: ActionType.UPDATE_TRANSFER,
    value: transferUpdate,
  };
}

export function removeTransferAction(callId: string): ActionModel {
  return {
    type: ActionType.REMOVE_TRANSFER,
    value: callId,
  };
}

export function acceptTransferAction(callId: string): ActionModel {
  return {
    type: ActionType.ACCEPT_TRANSFER,
    value: callId,
  };
}

export function rejectTransferAction(callId: string): ActionModel {
  return {
    type: ActionType.REJECT_TRANSFER,
    value: callId,
  };
}

export function cancelTransferAction(callId: string): ActionModel {
  return {
    type: ActionType.CANCEL_TRANSFER,
    value: callId,
  };
}

export function createTransferAction(
  file: File,
  clientId: string
): ActionModel {
  return {
    type: ActionType.CREATE_TRANSFER,
    value: {
      file,
      clientId,
    },
  };
}

export function addIceCandidateAction(callId: string, data: any): ActionModel {
  return {
    type: ActionType.ADD_ICE_CANDIDATE,
    value: {
      callId,
      data,
    },
  };
}

export function setLocalDescriptionAction(
  callId: string,
  data: any
): ActionModel {
  return {
    type: ActionType.SET_LOCAL_DESCRIPTION,
    value: {
      callId,
      data,
    },
  };
}

export function setRemoteDescriptionAction(
  callId: string,
  data: any
): ActionModel {
  return {
    type: ActionType.SET_REMOTE_DESCRIPTION,
    value: {
      callId,
      data,
    },
  };
}
