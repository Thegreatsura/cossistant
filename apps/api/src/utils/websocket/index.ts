/**
 * WebSocket utility functions
 * This module provides reusable utilities for WebSocket connection management
 */

export {
  type AuthResult,
  createConnectionEvent,
  createConnectionInfo,
  getConnectionIdFromSocket,
  handleAuthenticationFailure,
  handleIdentificationFailure,
  sendConnectionEstablishedMessage,
  sendError,
  storeConnectionId,
  updatePresenceIfNeeded,
} from "./websocket-connection";
export {
  WEBSOCKET_ERRORS,
  type WebSocketError,
  WebSocketErrorCode,
} from "./websocket-errors";
export {
  handleMessageError,
  parseMessage,
  validateMessage,
} from "./websocket-message";
export { updateLastSeenTimestamps } from "./websocket-updates";
