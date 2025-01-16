import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const BASE_URL = "http://localhost:5000";

export const usePushStore = create((set, get) => ({
    saveToken: async (token) => {
        try {
            const res = await axiosInstance.post(`/push/create`, { vapidKey: token });
            console.log(res.data);
        } catch (error) {
            console.log(error);
            toast.error("Failed to save token");
        }
    },
    sendNotification: async ({text, sender}) => {
        try {
            const res = await axiosInstance.post(`/fcm/send-notification`, { text, sender });
            console.log(res.data);
        } 
        catch (error) {
            console.log(error);
            toast.error("Failed to send notification");
        }
    }
}));
