import {create} from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import {io} from "socket.io-client";
import { storePrivateKey } from "../lib/storePrivateKey";

const BASE_URL = "http://localhost:5000";

export const useAuthStore = create((set, get) => ({
    authUser: null, // initially user is unauthenticated
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true, // as soon as we start the app, we are checking if the user is authenticate
    onlineUsers: [],
    socket: null,
    isGettingUsers: false,
    searchUsers: [],

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({authUser: res.data});

            get().connectSocket();
        } catch (error) {
            console.log("error in checkAuth", error);
            set({authUser: null});
        } finally {
            set({isCheckingAuth: false});
        }
    },

    signup: async (data) => {
        set({isSigningUp: true});
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({authUser: res.data});
            toast.success("Account created successfully");
            
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({isSigningUp: false});
        }
    },

    logout: async () => {
        try {
            await axiosInstance.get("/auth/logout");
            set({authUser: null});
            toast.success("Logged out Successfully");
            
            get().disConnectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    login: async (data) => {
        set({isLoggingIn: true});
        try {
            const res = await axiosInstance.post("/auth/login", data);
            console.log("res.data: ", res.data);
            set({authUser: res.data});
            toast.success("Logged-in successfully");

            console.log("console.log(process.env.ENCRYPTION_KEY): ", import.meta.env.VITE_ENCRYPTION_KEY);
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({isLoggingIn: false});  
        }
    },

    updateProfile: async (data) => {
        set({isUpdatingProfile: true});
        try {
            const res = await axiosInstance.patch("/auth/update-profile", data);
            set({authUser: res.data});
            toast.success("Profile updated successfully");
        } catch (error) {
            console.log("error in updateProfile", error);
            toast.error(error.response.data.message);
        } finally {
            set({isUpdatingProfile: false});
        }
    },

    getSearchUsers: async (search) => {
        set({isGettingUsers: true});
        try {
            console.log(search);
            if(search === "") {
                set({searchUsers: []});
            }
            const res = await axiosInstance.get(`/auth/users?search=${search}`);
            set({searchUsers: res.data});
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({isGettingUsers: false});
        }
    },

    connectSocket: () => {
        const {authUser} = get();
        if(!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            },
        });
        socket.connect();

        set({socket: socket});

        socket.on("getOnlineUsers", (userIds) => {
            set({onlineUsers: userIds});
        });
    },

    disConnectSocket: () => {
        if(get().socket?.connected) get().socket.disconnect();
    },
}));