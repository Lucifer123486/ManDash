import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FaBell } from 'react-icons/fa';
import './NotificationBell.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NotificationBell = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch initial notifications
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get(`${API_URL}/notifications/in-app`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setNotifications(res.data.data);
                setUnreadCount(res.data.data.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error('Error fetching notifications', err);
        }
    };

    const CustomCloseButton = ({ closeToast }) => (
        <button
            onClick={closeToast}
            style={{
                background: 'transparent',
                color: '#888',
                border: 'none',
                borderRadius: '50%',
                padding: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                marginLeft: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.color = '#333'}
            onMouseOut={(e) => e.target.style.color = '#888'}
        >
            ✕
        </button>
    );

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        fetchNotifications();

        // Connect Socket.io
        const socketUrl = API_URL.replace('/api', '');
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            // Join dynamic user room
            socket.emit('join', user.id || user._id);
        });

        socket.on('new_notification', (notif) => {
            console.log('Received new notification:', notif);
            // Trigger bottom right toast
            toast.info(notif.message, {
                position: "bottom-right",
                autoClose: false,
                hideProgressBar: true,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                closeButton: CustomCloseButton
            });
            // Update bell badge
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated, user]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const markAsRead = async (id, link) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/notifications/in-app/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            if (link) {
                setIsOpen(false);
                navigate(link);
            }
        } catch (err) {
            console.error('Error marking as read', err);
        }
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button className="bell-button" onClick={toggleDropdown}>
                <FaBell className="bell-icon" />
                {unreadCount > 0 && (
                    <span className="bell-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="dropdown-header">
                        <h4>Notifications</h4>
                    </div>
                    <div className="dropdown-body">
                        {notifications.length === 0 ? (
                            <p className="no-notifications">No new notifications</p>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif._id}
                                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                    onClick={() => markAsRead(notif._id, notif.link)}
                                >
                                    <div className="notif-title">{notif.title}</div>
                                    <div className="notif-message">{notif.message}</div>
                                    <div className="notif-time">
                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
