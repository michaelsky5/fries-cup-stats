import { createContext, useContext } from 'react'
import { coordinationWrite, fetchRoomMessages, liveRoomWrite } from './liveRoomApi.js'

// A room keeps one transport for its entire component tree. The public practice
// room provides a local implementation; the normal room retains its API client.
const RoomTransport = createContext({ coordinationWrite, fetchRoomMessages, liveRoomWrite })
export const RoomTransportProvider = RoomTransport.Provider
export function useRoomTransport() { return useContext(RoomTransport) }
