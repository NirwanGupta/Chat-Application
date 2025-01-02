import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './Skeletons/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { Ellipsis } from 'lucide-react';

const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessages, unsubscribeFromMessages, deleteMessage, editMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [deleteMsg, setDeleteMsg] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [editMsg, setEditMsg] = useState(false);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCancel = () => {
    setDeleteMsg(false);
    setMessageToDelete(null);
  };

  const handleDelete = () => {
    if (messageToDelete) {
      deleteMessage(messageToDelete._id);
      console.log(`Deleting message: ${messageToDelete._id}`);
      setDeleteMsg(false);
      setMessageToDelete(null);
    }
  };

  const handleEdit = () => {
    if (messageToDelete) {
      editMessage(messageToDelete._id);
      console.log(`Editing message: ${messageToDelete._id}`);
      setDeleteMsg(false);
      setMessageToDelete(null);
      setEditMsg(true);
    }
  }

  if (isMessagesLoading) return (
    <div className='flex-1 flex flex-col overflow-auto'>
      <ChatHeader />
      <MessageSkeleton />
      <MessageInput />
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col overflow-auto`}>
      {/* Modal for delete confirmation */}
      {deleteMsg && (
        <div className={`modal modal-open`} role="dialog">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Are you sure?</h3>
            <p className="py-4">Do you want to delete this message? This action cannot be undone.</p>
            <div className="modal-action">
              <button onClick={handleCancel} className="btn">Cancel</button>
              <button onClick={handleEdit} className='btn btn-danger'>Edit</button>
              <button onClick={handleDelete} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}

      <ChatHeader className={`${deleteMsg? 'opacity-50': ''}`}/>

      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${deleteMsg? 'opacity-50': ''}`}>
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={message.senderId === authUser._id ? authUser.profilePic : selectedUser.profilePic}
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {message.createdAt}
              </time>
            </div>
            <div className="chat-bubble flex flex-col rounded-2xl p-3 text-white">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p className={message.deleted? 'opacity-40': ''}>{message.text}</p>}
            </div>

            {/* Ellipsis icon for showing the delete modal */}
            <Ellipsis
              className={`${
                message.senderId !== authUser._id ? 'translate-x-12' : ''
              } text-gray-400 cursor-pointer hover:text-gray-600 transition duration-200`}
              onClick={() => {
                setDeleteMsg(true); // Show the delete modal
                setMessageToDelete(message); // Set the message to delete
              }}
            />
          </div>
        ))}
      </div>

      <MessageInput className={`${deleteMsg? 'opacity-50': ''}`}/>
    </div>
  );
};

export default ChatContainer;
