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

////////////////////////////////////////////
// ROOM EVENT MESSAGES - SERVER TO CLIENT //
////////////////////////////////////////////

export interface IBaseRoomEventMessage {
  type: 'room_event';
  roomId: RoomId;
  eventType: 'user_joined' | 'user_left' | 'user_data_changed' | 'admin_settings_changed' | 'plugin_set';
}

export interface IRoomEventJoinMessage extends IBaseRoomEventMessage {
  eventType: 'user_joined';
  data: { user: IUser };
}

export interface IRoomEventLeaveMessage extends IBaseRoomEventMessage {
  eventType: 'user_left';
  data: { user: IUser };
}

export interface IRoomEventUserDataChangeMessage extends IBaseRoomEventMessage {
  eventType: 'user_data_changed';
  data: { user: IUser, changedProperties: (keyof IUser)[] };
}

export interface IRoomEventPluginSet extends IBaseRoomEventMessage {
  eventType: 'plugin_set';
  data: { roomId: RoomId, iframeId: IframeId, plugin: IPlugin | null };
}

//////////////////////////////////////
// CLIENT TO SERVER ACTION MESSAGES //
//////////////////////////////////////

export type SocketToServerMessage = IMessageRelayMessage | ICreateRoomMessage | IRoomJoinMessage | IBroadcastMessage | IUserRegisterMessage | IUserLoginMessage | IPluginSetMessage;

interface IBaseSocketToServerMessage {
  awaitId?: AwaitId;
  data: unknown;
  timestamp?: number; // set on server
  socketId?: UserId; // set on server
}

export interface IBroadcastMessage extends IBaseSocketToServerMessage {
  action: 'room_broadcast';
  data: {roomIds: RoomId[]};
}

export interface IMessageRelayMessage<T = unknown> extends IBaseSocketToServerMessage {
  action: 'message_relay';
 data: { roomId: RoomId, receiverIds?: SocketId[], relayData: T};
}

export interface ICreateRoomMessage extends IBaseSocketToServerMessage {
  action: 'room_create';
  data: Partial<IBaseRoom>;
}

export interface IRoomJoinMessage extends IBaseSocketToServerMessage {
  action: 'room_join';
  data: { roomId: RoomId };
}

export interface IUserRegisterMessage extends IBaseSocketToServerMessage {
  action: 'user_register';
  data: { displayName: string };
}

export interface IUserLoginMessage extends IBaseSocketToServerMessage {
  action: 'user_login';
  data: { secret: string };
}

export interface IPluginSetMessage extends IBaseSocketToServerMessage {
  action: 'plugin_set';
  data: { roomId: RoomId, iframeId: IframeId, plugin: IPlugin | null };
}

///////////////////////////////////////////////
// CLIENT TO SERVER ACTION RESPONSE MESSAGES //
///////////////////////////////////////////////

export type RoomJoinErrorCode = 'wrong_password' | 'already_full' | 'does_not_exist' | 'already_joined' | 'invalid_admin_id' | null | undefined;
export type RoomCreateErrorCode = string | null | undefined;
export type UserRegisterErrorCode = 'missing_display_name' | 'display_name_too_short' | 'display_name_too_long' | null | undefined;
export type UserLoginErrorCode = 'user_not_found' | 'wrong_secret' | null | undefined;
export type PluginSetErrorCode = 'room_not_found' | 'plugin_not_found_in_db' | 'permission_denied' | null | undefined;

export interface IMessageRelayDeliveryMessage<T = unknown> {
  type: 'message_relay_delivery';
  awaitId: AwaitId;
  errors: string[];
  senderId: SocketId; // prevents malicious user from pretending to be someone else as this is set by server
  data: T;
}

export interface IBaseResponseMessage {
  type: string;
  awaitId: string;
  errors: (string | null | undefined)[];
}

export interface IRoomCreateResponseMessage extends IBaseResponseMessage {
  type: 'room_create_response';
  errors: RoomCreateErrorCode[];
  room: IAdminRoom;
}

export interface IRoomJoinResponseMessage extends IBaseResponseMessage {
  type: 'room_join_response';
  errors: RoomJoinErrorCode[];
  room: IBaseRoom;
  users: IUser[];
}

export interface IUserRegisterResponseMessage extends IBaseResponseMessage {
  type: 'user_register_response';
  user: IUser;
  secret: string;
  errors: UserRegisterErrorCode[];
}

export interface IUserLoginResponseMessage extends IBaseResponseMessage {
  type: 'user_login_response';
  token: string;
  user: IUser;
  errors: UserLoginErrorCode[];
}

export interface IPluginSetResponseMessage extends IBaseResponseMessage {
  type: 'plugin_set_response';
  roomId: RoomId;
  iframeId: IframeId;
  plugin: IPlugin | null;
}

/////////////////////////////////////////////////
// RELAY MESSAGES THE SERVER DOESNT CARE ABOUT //
/////////////////////////////////////////////////

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
