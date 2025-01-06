import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useNavigate } from 'react-router-dom';

const SearchPage = () => {
    const [search, setSearch] = useState('');
    const { users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
    const { getSearchUsers, searchUsers, onlineUsers } = useAuthStore();
    const navigate = useNavigate(); 

    useEffect(() => {
        if (search.trim() !== '') {
            getSearchUsers(search);
        }
    }, [search, getSearchUsers]);

    const handleChange = (e) => {
        setSearch(e.target.value);
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        navigate('/');
    }

    return (
        <div className="min-h-screen flex flex-col items-center mt-20">
            <div className="w-full max-w-3xl mt-10 px-4">
                <input
                    type="text"
                    value={search}
                    onChange={handleChange}
                    placeholder="Search user to chat"
                    className="w-full h-12 px-4 py-2 rounded-md border border-transparent bg-base-100/80 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
                />
            </div>

            <div className="flex-1 w-full max-w-3xl mt-6 px-4 overflow-y-auto rounded-md shadow-md">
                {searchUsers.map((user) => (
                    <button
                        key={user._id}
                        onClick={() => handleSelectUser(user)}
                        className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                            selectedUser?._id === user._id ? 'bg-base-300 ring-1 ring-base-300' : ''
                        }`}
                    >
                        <div className="relative">
                            <img
                                src={user.profilePic || 'https://via.placeholder.com/48'}
                                alt={user.name}
                                className="w-12 h-12 object-cover rounded-full"
                            />
                            {onlineUsers.includes(user._id) && (
                                <span
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 
                                    rounded-full ring-2 ring-white"
                                />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="font-medium truncate">{user.fullName || 'No Name'}</div>
                            <div className="text-sm text-gray-400 transform -translate-x-1/4">
                                {onlineUsers.includes(user._id) ? 'Online' : 'Offline'}
                            </div>
                        </div>
                        <p className="ml-auto text-sm text-blue-500 hover:underline">- Say Hey</p>

                    </button>
                ))}

                {searchUsers.length === 0 && (
                    <div className="text-center text-gray-500 py-4">No users found</div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
