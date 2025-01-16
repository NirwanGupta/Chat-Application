import {create} from "zustand"
import {axiosInstance} from "../lib/axios"
import toast from "react-hot-toast"
import { useAuthStore } from "./useAuthStore";
import {usePushStore} from './usePushStore';

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

    getUsers: async () => {
        set({isUsersLoading: true});
        try {
            const res = await axiosInstance.get("/message/users");
            set({users: res.data});
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({isUsersLoading: false});
        }
    },

    getMessages: async (userId) => {
        set({isMessagesLoading: true});
        try {
            const res = await axiosInstance.get(`/message/${userId}`);
            set({messages: res.data});

            
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({isMessagesLoading: false});
        }
    },

    sendMessage: async (data) => {
        const {messages, selectedUser} = get();
        try {
            console.log("data: ", data);
            const res = await axiosInstance.post(`/message/send/${selectedUser._id}`, data);
            set({messages: [...messages, res.data]});
            console.log(messages);
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    subscribeToMessages: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;
        const sendNotification = usePushStore.getState().sendNotification;

        socket.on("newMessage", (newMessage) => {
            const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
            if (!isMessageSentFromSelectedUser) return;

            set({
                messages: [...get().messages, newMessage],
            });
            sendNotification({text: newMessage.text, sender: selectedUser.fullName});
        });

        socket.on("deleteMessage", (cacheMessages) => {
            set({messages: cacheMessages});
        });

        socket.on("editMessage", (cacheMessages) => {
            set({messages: cacheMessages});
        })
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
    },

    setSelectedUser: (selectedUser) => set({selectedUser}),

    deleteMessage: async (messageId) => {
        const {messages} = get();
        const { selectedUser } = get();
        const socket = useAuthStore.getState().socket;
        try {
            const res = await axiosInstance.delete(`/message/delete/${messageId}`);
            set({messages: res.data});
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    editMessage : async (message) => {
        const messageId = message._id;
        const text = message.text;
        console.log(message._id, message.text);
        const {messages} = get();
        try {
            const res = await axiosInstance.patch(`/message/edit/${messageId}`, {text});
            set({messages: res.data});
        } catch (error) {
            toast.error(error.response.data.message);
        }
    }
}));