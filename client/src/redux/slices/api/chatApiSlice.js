import { CHAT_URL } from "../../../utils/contants";
import { apiSlice } from "../apiSlice";

export const chatApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createChatRoom: builder.mutation({
      query: (data) => ({
        url: `${CHAT_URL}/create`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),
    getMyChatRooms: builder.query({
      query: () => ({
        url: `${CHAT_URL}/my-rooms`,
        method: "GET",
        credentials: "include",
      }),
    }),
    getRoomByKey: builder.query({
      query: (key) => ({
        url: `${CHAT_URL}/${key}`,
        method: "GET",
        credentials: "include",
      }),
    }),
    endChatSession: builder.mutation({
      query: (key) => ({
        url: `${CHAT_URL}/end/${key}`,
        method: "PUT",
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useCreateChatRoomMutation,
  useEndChatSessionMutation,
  useGetMyChatRoomsQuery,
  useGetRoomByKeyQuery,
} = chatApiSlice;
