export type AwaitId = string;
export type RoomId = string;
export type SocketId = string;
export type UserId = string;
export type PluginId = string;
export type IframeId = string;

//////////////////////////
// DATAMODELS - GENERAL //
//////////////////////////

export interface IBaseRoom {
  id: RoomId;
  name: string;
  maxUsers: number;
  joinedUsers: UserId[]; // TODO make IUser but maybe only when retrieving or on demand?
  adminUsers: UserId[];
  metadata: Record<string, unknown>;
  parentRoom?: IBaseRoom;
  childRooms?: IBaseRoom[];
}

export interface IAdminRoom extends IBaseRoom {
  adminId: RoomId; // TODO implement
}

export interface IPlugin {
  id: PluginId;
  name: string;
  version: string;
  description: string;
  url: string;
}

export interface IUser {
  id: UserId;
  displayName: string;
  status: string;
  lastSeen: number;
  stream?: MediaStream;
}

export interface IUserSecret {
  userId: UserId;
  secret: string;
}

///////////////////////////////
// SERVER TO CLIENT MESSAGES //
///////////////////////////////

// SERVER TO CLIENT MESSAGES - EVENTS //
export type RoomEventMessage = IRoomEventJoinMessage | IRoomEventLeaveMessage | IRoomEventUserDataChangeMessage | IRoomEventPluginSet;

export interface IBaseServerToSocketMessage {
  type: string;
  awaitId: AwaitId;
  timestamp: number;
  data: unknown;
}

export interface IBaseRoomEventMessage extends IBaseServerToSocketMessage {
  roomId: RoomId;
}

export interface IRoomEventJoinMessage extends IBaseRoomEventMessage {
  type: 'room_event__user_joined';
  data: { user: IUser };
}

export interface IRoomEventLeaveMessage extends IBaseRoomEventMessage {
  type: 'room_event__user_left';
  data: { user: IUser };
}

export interface IRoomEventUserDataChangeMessage extends IBaseRoomEventMessage {
  type: 'room_event__user_data_changed';
  data: { user: IUser, changedProperties: (keyof IUser)[] };
}

export interface IRoomEventPluginSet extends IBaseRoomEventMessage {
  type: 'room_event__plugin_set';
  data: { iframeId: IframeId, plugin: IPlugin | null };
}

// SERVER TO CLIENT MESSAGES - REQUEST RESPONSES //
export type RequestResponseMessage = IRoomCreateResponseMessage | IRoomJoinResponseMessage | IUserRegisterResponseMessage | IUserLoginResponseMessage | IPluginSetResponseMessage;


export interface IBaseResponseMessage {
  type: string;
  requestType: string;
  awaitId: string;
}

export type RoomCreateErrorCode = string;
export interface IRoomCreateResponseMessage extends IBaseResponseMessage {
  type: 'request_response__room_create';
  requestType: ICreateRoomMessage['type'];
  errors: RoomCreateErrorCode[];
  room: IAdminRoom;
}

export type RoomJoinErrorCode = 'wrong_password' | 'already_full' | 'does_not_exist' | 'already_joined' | 'invalid_admin_id';
export interface IRoomJoinResponseMessage extends IBaseResponseMessage {
  type: 'request_response__room_join';
  requestType: IRoomJoinMessage['type'];
  errors: RoomJoinErrorCode[];
  room: IBaseRoom;
  users: IUser[];
}

export type UserRegisterErrorCode = 'missing_display_name' | 'display_name_too_short' | 'display_name_too_long';
export interface IUserRegisterResponseMessage extends IBaseResponseMessage {
  type: 'request_response__user_register';
  requestType: IUserRegisterMessage['type'];
  user: IUser;
  secret: string;
  errors: UserRegisterErrorCode[];
}

export type UserLoginErrorCode = 'user_not_found' | 'wrong_secret';
export interface IUserLoginResponseMessage extends IBaseResponseMessage {
  type: 'request_response__user_login';
  requestType: IUserLoginMessage['type'];
  token: string;
  user: IUser;
  errors: UserLoginErrorCode[];
}

export type PluginSetErrorCode = 'room_not_found' | 'plugin_not_found_in_db' | 'permission_denied';
export interface IPluginSetResponseMessage extends IBaseResponseMessage {
  type: 'request_response__plugin_set';
  requestType: IPluginSetMessage['type'];
  roomId: RoomId;
  iframeId: IframeId;
  plugin: IPlugin | null;
}

export interface IGeneralErrorResponseMessage extends IBaseResponseMessage {
  type: 'request_response__general_error';
  requestType: RequestMessage['type'];
  code: number; // comparable to http status codes to give some more context about type of error
  message: string;
}

////////////////////////////////////////////////
// SOCKET TO SOCKET VIA SERVER RELAY MESSAGES //
////////////////////////////////////////////////

// This message type is special not sure in which category to put it
export interface IMessageRelayDeliveryMessage<T = unknown> {
  type: 'message_relay_delivery';
  awaitId: AwaitId;
  roomId: RoomId;
  senderId: SocketId; // set by server to prevent malicious users from pretending to send messages as someone else
  errors: string[];
  relayData: T;
}

export interface IRTCSessionDescriptionMessage {
  type: 'session_description';
  description: RTCSessionDescriptionInit;
  senderSocketId: SocketId;
  micEnabled: boolean;
  camEnabled: boolean;
  streamEnabled: boolean;
}

export interface IRTCIceCandidatesMessage {
  type: 'ice_candidates';
  iceCandidates: RTCIceCandidateInit[];
  senderSocketId: SocketId;
}

///////////////////////////////
// SOCKET TO SERVER MESSAGES //
///////////////////////////////

export type RequestMessage = IMessageRelayMessage | ICreateRoomMessage | IRoomJoinMessage | IBroadcastMessage | IUserRegisterMessage | IUserLoginMessage | IPluginSetMessage;

interface IBaseSocketToServerMessage {
  awaitId: AwaitId;
  data: never;
  body: unknown; // Imagine it like the body of an http request
  timestamp?: number; // set on server on arrival
  socketId?: UserId; // set on server on arrival
}

export interface IBroadcastMessage extends IBaseSocketToServerMessage {
  type: 'request__room_broadcast';
  body: {roomIds: RoomId[]};
}

export interface IMessageRelayMessage<T = unknown> extends IBaseSocketToServerMessage {
  type: 'request__message_relay';
  body: { roomId: RoomId, receiverIds?: SocketId[], relayData: T};
}

export interface ICreateRoomMessage extends IBaseSocketToServerMessage {
  type: 'request__room_create';
  body: Partial<IBaseRoom>;
}

export interface IRoomJoinMessage extends IBaseSocketToServerMessage {
  type: 'request__room_join';
  body: { roomId: RoomId };
}

export interface IUserRegisterMessage extends IBaseSocketToServerMessage {
  type: 'request__user_register';
  body: { displayName: string };
}

export interface IUserLoginMessage extends IBaseSocketToServerMessage {
  type: 'request__user_login';
  body: { secret: string };
}

export interface IPluginSetMessage extends IBaseSocketToServerMessage {
  type: 'request__plugin_set';
  body: { roomId: RoomId, iframeId: IframeId, plugin: IPlugin | null };
}

///////////////////////////////////////////////
// CLIENT TO SERVER ACTION RESPONSE MESSAGES //

///////////////////
// VARIOUS TYPES //
///////////////////

export type PeerConnection = RTCPeerConnection & { remoteSocketId: string, defaultDataChannel: RTCDataChannel, stream: MediaStream }; // TODO why stream needed here?

export type Socket = WebSocket & { id: string };

export interface IAwaitedPromise {
  promise: Promise<unknown>;
  resolve: (value: unknown | PromiseLike<unknown>) => void
  reject: (reason?: any) => void;
}

// This is what the plugins in the iframe using the legacySDK sends to the parent window
export interface IPluginMessageLegacy {
  type: 'PLUGIN_SEND_TO_ALL_PEERS' | 'PLUGIN_SEND_TO_PEER';
  payload: unknown;
  socketId: string;
}
