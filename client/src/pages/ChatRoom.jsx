import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  useCreateChatRoomMutation,
  useEndChatSessionMutation,
  useGetMyChatRoomsQuery,
} from "../redux/slices/api/chatApiSlice";
import { useGetTeamListsQuery } from "../redux/slices/api/userApiSlice";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false,
});

const ChatRoom = () => {
  const { user } = useSelector((state) => state.auth);
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [activeKey, setActiveKey] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState([]);
  const [selectedInvitees, setSelectedInvitees] = useState([]);

  const { data: teamData = [] } = useGetTeamListsQuery({ search: "" });
  const { data: roomData, refetch } = useGetMyChatRoomsQuery();
  const [createChatRoom, { isLoading: isCreating }] = useCreateChatRoomMutation();
  const [endChatSession, { isLoading: isEnding }] = useEndChatSessionMutation();

  const activeRoom = useMemo(
    () => roomData?.rooms?.find((room) => room.key === activeKey),
    [roomData, activeKey]
  );

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("chat:join-request", (payload) => {
      setPendingJoinRequests((prev) => [...prev, payload]);
      toast.info(`${payload.memberName} requested to join room ${payload.key}`);
    });

    socket.on("chat:join-response", ({ key, approved }) => {
      if (approved) {
        setActiveKey(key);
        socket.emit("chat:join-room", { key });
        toast.success(`Join accepted for ${key}`);
      } else {
        toast.error(`Join request rejected for ${key}`);
      }
    });

    socket.on("chat:history", ({ key, messages: roomMessages }) => {
      if (key === activeKey || !activeKey) {
        setMessages(roomMessages || []);
      }
    });

    socket.on("chat:new-message", ({ key, message }) => {
      if (key === activeKey) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("chat:session-ended", ({ key }) => {
      if (key === activeKey) {
        setMessages([]);
        setActiveKey("");
      }
      refetch();
      toast.info(`Chat session ${key} ended. Messages were cleared.`);
    });

    socket.on("chat:join-pending", ({ key }) => {
      toast.info(`Join request sent for ${key}`);
    });
    socket.on("chat:error", (message) => toast.error(message));

    return () => {
      socket.off("chat:join-request");
      socket.off("chat:join-response");
      socket.off("chat:history");
      socket.off("chat:new-message");
      socket.off("chat:session-ended");
      socket.off("chat:join-pending");
      socket.off("chat:error");
    };
  }, [activeKey, refetch]);

  const handleCreateRoom = async () => {
    try {
      const response = await createChatRoom({
        invitedMembers: selectedInvitees,
      }).unwrap();
      const key = response?.room?.key;
      setActiveKey(key);
      setRoomKeyInput(key);
      socket.emit("chat:join-room", { key });
      toast.success(`Room key generated: ${key}`);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Unable to create chat room.");
    }
  };

  const handleRequestJoin = () => {
    if (!roomKeyInput.trim()) return;
    socket.emit("chat:request-join", { key: roomKeyInput.trim().toUpperCase() });
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeKey) return;
    socket.emit("chat:send-message", { key: activeKey, text: messageInput });
    setMessageInput("");
  };

  const handleRespondJoin = (request, approve) => {
    socket.emit("chat:respond-request", {
      key: request.key,
      memberId: request.memberId,
      approve,
    });
    setPendingJoinRequests((prev) =>
      prev.filter((item) => item.memberId !== request.memberId || item.key !== request.key)
    );
  };

  const handleEndSession = async () => {
    if (!activeKey) return;
    try {
      await endChatSession(activeKey).unwrap();
      socket.emit("chat:end-session", { key: activeKey });
      setMessages([]);
      setActiveKey("");
      refetch();
      toast.success("Chat session ended. Messages deleted.");
    } catch (error) {
      toast.error(error?.data?.message || "Unable to end session.");
    }
  };

  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-bold text-gray-700'>Team Chat Room</h1>

      <div className='bg-white rounded shadow p-4 space-y-3'>
        <p className='font-semibold'>Create Room (Host)</p>
        <select
          multiple
          className='w-full border rounded p-2'
          onChange={(e) =>
            setSelectedInvitees(
              Array.from(e.target.selectedOptions).map((option) => option.value)
            )
          }
        >
          {teamData
            .filter((member) => member._id !== user?._id)
            .map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} ({member.role})
              </option>
            ))}
        </select>
        <button
          disabled={isCreating}
          onClick={handleCreateRoom}
          className='bg-blue-600 text-white rounded px-4 py-2'
        >
          Generate Room Key
        </button>
      </div>

      <div className='bg-white rounded shadow p-4 space-y-3'>
        <p className='font-semibold'>Join Room</p>
        <div className='flex gap-2'>
          <input
            value={roomKeyInput}
            onChange={(e) => setRoomKeyInput(e.target.value)}
            placeholder='Enter room key'
            className='border rounded px-3 py-2 flex-1'
          />
          <button onClick={handleRequestJoin} className='bg-green-600 text-white rounded px-4'>
            Request Join
          </button>
        </div>
      </div>

      {pendingJoinRequests.length > 0 && (
        <div className='bg-white rounded shadow p-4 space-y-2'>
          <p className='font-semibold'>Pending Join Requests</p>
          {pendingJoinRequests.map((request) => (
            <div key={`${request.key}-${request.memberId}`} className='flex justify-between'>
              <span>
                {request.memberName} wants to join {request.key}
              </span>
              <div className='space-x-2'>
                <button
                  onClick={() => handleRespondJoin(request, true)}
                  className='bg-blue-600 text-white rounded px-3 py-1'
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespondJoin(request, false)}
                  className='bg-red-600 text-white rounded px-3 py-1'
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='bg-white rounded shadow p-4 space-y-3'>
        <div className='flex justify-between items-center'>
          <p className='font-semibold'>Live Chat {activeKey ? `(${activeKey})` : ""}</p>
          {activeRoom?.host?._id === user?._id && (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className='bg-red-600 text-white rounded px-3 py-1'
            >
              End Session
            </button>
          )}
        </div>
        <div className='h-64 overflow-y-auto border rounded p-2 space-y-2'>
          {messages.map((message, index) => (
            <div key={`${message?.sentAt}-${index}`}>
              <span className='font-semibold mr-2'>{message?.sender?.name || "User"}:</span>
              <span>{message?.text}</span>
            </div>
          ))}
        </div>
        <div className='flex gap-2'>
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder='Type a message...'
            className='border rounded px-3 py-2 flex-1'
          />
          <button onClick={handleSendMessage} className='bg-blue-600 text-white rounded px-4'>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
